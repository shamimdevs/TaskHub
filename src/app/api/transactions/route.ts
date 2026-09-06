import type { TxnType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiRole, isResponse, json, pageParams } from "@/lib/api";

const TXN_TYPES: TxnType[] = [
  "deposit",
  "campaign_spend",
  "task_reward",
  "withdrawal",
  "withdrawal_fee",
  "referral_bonus",
  "penalty",
  "adjustment",
];

export async function GET(req: Request) {
  const auth = await requireApiRole(req, "admin");
  if (isResponse(auth)) return auth;

  const typeParam = new URL(req.url).searchParams.get("type");
  const type =
    typeParam && TXN_TYPES.includes(typeParam as TxnType)
      ? (typeParam as TxnType)
      : undefined;
  const { skip, take } = pageParams(req, 100);

  const transactions = await prisma.walletTransaction.findMany({
    where: type ? { type } : {},
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
  return json(transactions);
}
