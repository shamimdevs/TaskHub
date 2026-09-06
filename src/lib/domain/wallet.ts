import "server-only";
import { Prisma } from "@prisma/client";
import type { TxnType, TxnDirection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DomainError } from "./errors";

type Tx = Prisma.TransactionClient;

const EARNING_TYPES: TxnType[] = ["task_reward", "referral_bonus"];
const SPEND_TYPES: TxnType[] = ["campaign_spend"];

interface PostArgs {
  tx: Tx;
  userId: string;
  type: TxnType;
  direction: TxnDirection;
  amount: number | Prisma.Decimal;
  description: string;
  reference?: string;
  /** Credit into the held `pendingBalance` instead of the spendable `balance`. */
  pending?: boolean;
}

/**
 * The single entry point for moving money. Always call inside a
 * `prisma.$transaction`, passing the transaction client as `tx`.
 * Updates the user's running balances and appends one ledger row.
 */
export async function postTransaction({
  tx,
  userId,
  type,
  direction,
  amount,
  description,
  reference,
  pending = false,
}: PostArgs) {
  const amt = new Prisma.Decimal(amount);
  if (amt.lte(0)) throw new DomainError("Amount must be positive");

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { balance: true, pendingBalance: true },
  });
  if (!user) throw new DomainError("User not found", 404);

  if (pending) {
    if (direction !== "credit") throw new DomainError("Pending transactions must be credits");
    await tx.user.update({
      where: { id: userId },
      data: { pendingBalance: { increment: amt } },
    });
    return tx.walletTransaction.create({
      data: {
        userId,
        type,
        direction,
        amount: amt,
        balanceAfter: user.balance,
        status: "pending",
        reference,
        description,
      },
    });
  }

  const delta = direction === "credit" ? amt : amt.negated();
  const balanceAfter = user.balance.plus(delta);
  if (balanceAfter.lt(0)) throw new DomainError("Insufficient balance");

  const data: Prisma.UserUpdateInput = { balance: balanceAfter };
  if (direction === "credit" && EARNING_TYPES.includes(type)) {
    data.lifetimeEarned = { increment: amt };
  }
  if (direction === "debit" && SPEND_TYPES.includes(type)) {
    data.lifetimeSpent = { increment: amt };
  }
  await tx.user.update({ where: { id: userId }, data });

  return tx.walletTransaction.create({
    data: {
      userId,
      type,
      direction,
      amount: amt,
      balanceAfter,
      status: "completed",
      reference,
      description,
    },
  });
}

/**
 * Moves a previously-held reward from `pendingBalance` to spendable `balance`
 * and settles its ledger row. Used when a submission's hold period elapses.
 */
export async function settlePendingReward({
  tx,
  userId,
  reference,
  amount,
  description,
}: {
  tx: Tx;
  userId: string;
  reference: string;
  amount: number | Prisma.Decimal;
  description: string;
}) {
  const amt = new Prisma.Decimal(amount);
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { balance: true, pendingBalance: true },
  });
  if (!user) throw new DomainError("User not found", 404);

  const newPending = Prisma.Decimal.max(new Prisma.Decimal(0), user.pendingBalance.minus(amt));
  const balanceAfter = user.balance.plus(amt);

  await tx.user.update({
    where: { id: userId },
    data: {
      pendingBalance: newPending,
      balance: balanceAfter,
      lifetimeEarned: { increment: amt },
    },
  });

  await tx.walletTransaction.updateMany({
    where: { userId, reference, type: "task_reward", status: "pending" },
    data: { status: "completed", balanceAfter, description },
  });

  return balanceAfter;
}

/** Convenience wrapper that opens its own transaction. */
export function postTransactionAtomic(args: Omit<PostArgs, "tx">) {
  return prisma.$transaction((tx) => postTransaction({ ...args, tx }));
}
