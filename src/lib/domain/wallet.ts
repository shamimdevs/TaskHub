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
  /**
   * Credit into `balance` as usual, but also mark it as held: it counts in the
   * balance and cannot be withdrawn until `releaseHeldReward` lets it go.
   */
  held?: boolean;
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
  held = false,
}: PostArgs) {
  const amt = new Prisma.Decimal(amount);
  if (amt.lte(0)) throw new DomainError("Amount must be positive");
  if (held && direction !== "credit") throw new DomainError("Only credits can be held");

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });
  if (!user) throw new DomainError("User not found", 404);

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
  if (held) data.heldBalance = { increment: amt };
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
 * Lifts the hold on a reward that is already in the balance, so it becomes
 * withdrawable. Moves no money: only `heldBalance` shrinks. Used when a hold
 * elapses, and when a held reward is reversed (the debit is posted separately).
 */
export async function releaseHeldReward({
  tx,
  userId,
  amount,
}: {
  tx: Tx;
  userId: string;
  amount: number | Prisma.Decimal;
}) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { heldBalance: true },
  });
  if (!user) throw new DomainError("User not found", 404);

  // Floored at zero: the column is 2dp while rewards are 4dp, so rounding can
  // leave it a cent adrift, and it must never lock more than is really held.
  const heldBalance = Prisma.Decimal.max(
    new Prisma.Decimal(0),
    user.heldBalance.minus(amount),
  );
  await tx.user.update({ where: { id: userId }, data: { heldBalance } });
}

/** What a withdrawal may take: the balance minus whatever is still on hold. */
export function withdrawable(user: { balance: Prisma.Decimal; heldBalance: Prisma.Decimal }) {
  return Prisma.Decimal.max(new Prisma.Decimal(0), user.balance.minus(user.heldBalance));
}

/** Convenience wrapper that opens its own transaction. */
export function postTransactionAtomic(args: Omit<PostArgs, "tx">) {
  return prisma.$transaction((tx) => postTransaction({ ...args, tx }));
}
