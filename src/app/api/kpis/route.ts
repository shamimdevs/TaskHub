import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiRole, isResponse, json } from "@/lib/api";
import { getSettings } from "@/lib/domain/settings";

interface MonthRow {
  label: string;
  commission: number;
  payout: number;
}

export async function GET(req: Request) {
  const auth = await requireApiRole(req, "admin");
  if (isResponse(auth)) return auth;

  const [
    commissionAgg,
    volumeAgg,
    payoutAgg,
    settings,
    totalUsers,
    activeWorkers,
    activeBuyers,
    pendingDeposits,
    pendingWithdrawals,
    submissionsOnHold,
    campaignsAwaitingReview,
    series,
  ] = await Promise.all([
    // The platform's only income: the commission cut from each withdrawal.
    prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "withdrawal_fee", status: "completed" },
    }),
    // Buyer spend. Passed straight through to workers — not platform income.
    prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "campaign_spend" },
    }),
    prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: { in: ["task_reward", "referral_bonus"] }, status: "completed" },
    }),
    getSettings(),
    prisma.user.count(),
    prisma.user.count({ where: { role: "worker", status: "active" } }),
    prisma.user.count({ where: { role: "buyer", status: "active" } }),
    prisma.deposit.count({ where: { status: "pending" } }),
    prisma.withdrawal.count({ where: { status: "pending" } }),
    prisma.submission.count({ where: { status: "on_hold" } }),
    prisma.campaign.count({ where: { status: "pending_review" } }),
    prisma.$queryRaw<{ month: Date; commission: Prisma.Decimal; payout: Prisma.Decimal }[]>`
      SELECT date_trunc('month', "createdAt") AS month,
             COALESCE(SUM(CASE WHEN "type" = 'withdrawal_fee' AND "status" = 'completed' THEN "amount" ELSE 0 END), 0) AS commission,
             COALESCE(SUM(CASE WHEN "type" IN ('task_reward','referral_bonus') AND "status" = 'completed' THEN "amount" ELSE 0 END), 0) AS payout
      FROM "WalletTransaction"
      WHERE "createdAt" >= date_trunc('month', now()) - interval '11 months'
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  ]);

  const commissionSeries: MonthRow[] = series.map((r) => ({
    label: new Date(r.month).toLocaleString("en", { month: "short" }),
    commission: Math.round(Number(r.commission)),
    payout: Math.round(Number(r.payout)),
  }));

  return json({
    commissionEarned: Math.round(Number(commissionAgg._sum.amount ?? 0)),
    withdrawFeePct: settings.withdrawFeePct,
    platformVolume: Math.round(Number(volumeAgg._sum.amount ?? 0)),
    payoutsPaid: Math.round(Number(payoutAgg._sum.amount ?? 0)),
    totalUsers,
    activeWorkers,
    activeBuyers,
    pendingDeposits,
    pendingWithdrawals,
    submissionsOnHold,
    campaignsAwaitingReview,
    commissionSeries,
  });
}
