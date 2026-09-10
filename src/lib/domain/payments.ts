import "server-only";
import { Prisma } from "@prisma/client";
import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatBdt, formatMoney } from "@/lib/utils";
import { getSettings } from "./settings";
import { postTransaction, withdrawable } from "./wallet";
import { notify, notifyAdmins } from "./notifications";
import { DomainError } from "./errors";

/* ----------------------------- deposits ---------------------------- */

/**
 * Buyers top up in taka over bKash/Nagad; the wallet is in dollars. The rate
 * is locked here, so an admin changing it later never re-prices a deposit that
 * is already waiting for review.
 */
export async function createDeposit(
  buyer: { id: string; name: string },
  input: {
    method: PaymentMethod;
    senderNumber: string;
    trxId: string;
    amountBdt: number;
  },
) {
  const settings = await getSettings();
  const usdRate = new Prisma.Decimal(settings.usdRate);
  if (usdRate.lte(0)) throw new DomainError("Exchange rate is not configured");

  const amountBdt = new Prisma.Decimal(input.amountBdt).toDecimalPlaces(2);
  const amount = amountBdt.dividedBy(usdRate).toDecimalPlaces(2);
  if (amount.lt(settings.minDeposit)) {
    throw new DomainError(
      `Minimum deposit is $${settings.minDeposit} (৳${Math.ceil(
        settings.minDeposit * settings.usdRate,
      )})`,
    );
  }

  const deposit = await prisma.$transaction(async (tx) => {
    const deposit = await tx.deposit.create({
      data: {
        buyerId: buyer.id,
        buyerName: buyer.name,
        method: input.method,
        senderNumber: input.senderNumber.trim(),
        trxId: input.trxId.trim(),
        amountBdt,
        usdRate,
        amount,
        status: settings.autoApproveDeposits ? "approved" : "pending",
        reviewedAt: settings.autoApproveDeposits ? new Date() : null,
      },
    });
    if (settings.autoApproveDeposits) {
      await postTransaction({
        tx,
        userId: buyer.id,
        type: "deposit",
        direction: "credit",
        amount,
        description: `${input.method} deposit approved`,
        reference: deposit.trxId,
      });
    }
    return deposit;
  });

  // Told after the commit, never inside it: a notification must not be able to
  // roll the money back, and a rolled-back deposit must never be announced.
  if (deposit.status === "approved") {
    await notify({
      userId: buyer.id,
      kind: "success",
      title: "Deposit credited",
      body: `${formatBdt(deposit.amountBdt.toNumber())} added — ${formatMoney(
        deposit.amount.toNumber(),
      )} is in your wallet.`,
      href: "/buyer/wallet",
      invalidate: ["Wallet", "Deposit"],
    });
  } else {
    await notifyAdmins({
      kind: "warning",
      title: "Deposit waiting for review",
      body: `${buyer.name} sent ${formatBdt(
        deposit.amountBdt.toNumber(),
      )} · TrxID ${deposit.trxId}`,
      href: "/admin/deposits",
      invalidate: ["Deposit", "Kpi"],
    });
  }
  return deposit;
}

export async function reviewDeposit(
  reviewerId: string,
  id: string,
  action: "approve" | "reject",
  note?: string,
) {
  const deposit = await prisma.$transaction(async (tx) => {
    const deposit = await tx.deposit.findUnique({ where: { id } });
    if (!deposit) throw new DomainError("Deposit not found", 404);
    if (deposit.status !== "pending") throw new DomainError("Deposit already reviewed");

    if (action === "approve") {
      await postTransaction({
        tx,
        userId: deposit.buyerId,
        type: "deposit",
        direction: "credit",
        amount: deposit.amount,
        description: `${deposit.method} deposit approved`,
        reference: deposit.trxId,
      });
    }
    return tx.deposit.update({
      where: { id },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        note: note?.trim() || (action === "reject" ? "Transaction could not be verified." : null),
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  });

  const approved = deposit.status === "approved";
  await notify({
    userId: deposit.buyerId,
    kind: approved ? "success" : "danger",
    title: approved ? "Deposit approved" : "Deposit rejected",
    body: approved
      ? `${formatBdt(deposit.amountBdt.toNumber())} credited — ${formatMoney(
          deposit.amount.toNumber(),
        )} is in your wallet.`
      : deposit.note || "That TrxID could not be verified.",
    href: "/buyer/wallet",
    invalidate: ["Wallet", "Deposit", "Kpi"],
  });
  return deposit;
}

/* --------------------------- withdrawals -------------------------- */

export async function createWithdrawal(
  worker: { id: string; name: string },
  input: { method: PaymentMethod; accountNumber: string; amount: number },
) {
  const settings = await getSettings();
  const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
  if (amount.lt(settings.minWithdraw)) {
    throw new DomainError(`Minimum withdrawal is $${settings.minWithdraw}`);
  }
  const fee = amount.times(settings.withdrawFeePct).dividedBy(100).toDecimalPlaces(2);
  const net = amount.minus(fee);
  // Requested in dollars, paid out in taka at today's rate.
  const usdRate = new Prisma.Decimal(settings.usdRate);
  const payoutBdt = net.times(usdRate).toDecimalPlaces(2);

  const withdrawal = await prisma.$transaction(async (tx) => {
    // Held rewards are in the balance but not ours to pay out yet.
    const user = await tx.user.findUnique({
      where: { id: worker.id },
      select: { balance: true, heldBalance: true },
    });
    if (!user) throw new DomainError("User not found", 404);
    const free = withdrawable(user);
    if (amount.gt(free)) {
      throw new DomainError(
        user.heldBalance.gt(0)
          ? `You can withdraw up to ${formatMoney(free.toNumber())} — ${formatMoney(
              user.heldBalance.toNumber(),
            )} of your balance is still on hold`
          : "Insufficient balance",
      );
    }

    const withdrawal = await tx.withdrawal.create({
      data: {
        workerId: worker.id,
        workerName: worker.name,
        method: input.method,
        accountNumber: input.accountNumber.trim(),
        amount,
        fee,
        net,
        usdRate,
        payoutBdt,
        status: "pending",
      },
    });
    // Reserve the funds now; refunded if the request is rejected.
    await postTransaction({
      tx,
      userId: worker.id,
      type: "withdrawal",
      direction: "debit",
      amount: net,
      description: `Withdrawal to ${input.method}`,
      reference: withdrawal.id,
    });
    if (fee.gt(0)) {
      await postTransaction({
        tx,
        userId: worker.id,
        type: "withdrawal_fee",
        direction: "debit",
        amount: fee,
        description: `Withdrawal fee (${settings.withdrawFeePct}%)`,
        reference: withdrawal.id,
      });
    }
    return withdrawal;
  });

  await notifyAdmins({
    kind: "warning",
    title: "Withdrawal requested",
    body: `${worker.name} wants ${formatMoney(
      withdrawal.amount.toNumber(),
    )} to ${withdrawal.method} ${withdrawal.accountNumber}`,
    href: "/admin/withdrawals",
    invalidate: ["Withdrawal", "Kpi"],
  });
  return withdrawal;
}

export async function reviewWithdrawal(
  reviewerId: string,
  id: string,
  action: "approve" | "reject" | "markPaid",
  note?: string,
) {
  const withdrawal = await prisma.$transaction(async (tx) => {
    const w = await tx.withdrawal.findUnique({ where: { id } });
    if (!w) throw new DomainError("Withdrawal not found", 404);

    if (action === "reject") {
      if (w.status === "paid" || w.status === "rejected") {
        throw new DomainError("This withdrawal was already finalised");
      }
      await postTransaction({
        tx,
        userId: w.workerId,
        type: "adjustment",
        direction: "credit",
        amount: w.amount,
        description: `Withdrawal rejected — refund`,
        reference: w.id,
      });
      await tx.walletTransaction.updateMany({
        where: { reference: w.id, type: { in: ["withdrawal", "withdrawal_fee"] } },
        data: { status: "reversed" },
      });
      return tx.withdrawal.update({
        where: { id },
        data: {
          status: "rejected",
          note: note?.trim() || "Account details could not be verified.",
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });
    }

    const nextStatus = action === "markPaid" ? "paid" : "approved";
    return tx.withdrawal.update({
      where: { id },
      data: {
        status: nextStatus,
        note: note?.trim() || w.note,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  });

  const payout = `${formatMoney(withdrawal.net.toNumber())} (${formatBdt(
    withdrawal.payoutBdt.toNumber(),
  )})`;
  const said = {
    approved: {
      kind: "info" as const,
      title: "Withdrawal approved",
      body: `${payout} is being sent to your ${withdrawal.method} account.`,
    },
    paid: {
      kind: "success" as const,
      title: "Withdrawal paid",
      body: `${payout} sent to ${withdrawal.method} ${withdrawal.accountNumber}.`,
    },
    rejected: {
      kind: "danger" as const,
      title: "Withdrawal rejected",
      body: withdrawal.note || "Your balance has been refunded.",
    },
    pending: null,
  }[withdrawal.status];

  if (said) {
    await notify({
      userId: withdrawal.workerId,
      ...said,
      href: "/worker/wallet",
      invalidate: ["Wallet", "Withdrawal", "Kpi"],
    });
  }
  return withdrawal;
}
