import { db, json, kpis, tick } from "@/app/api/_data/db";

export async function GET() {
  await tick();
  // recompute the live counters off the mutable store
  return json({
    ...kpis,
    pendingDeposits: db.deposits.filter((d) => d.status === "pending").length,
    pendingWithdrawals: db.withdrawals.filter((w) => w.status === "pending").length,
    submissionsOnHold: db.submissions.filter((s) => s.status === "on_hold").length,
    campaignsAwaitingReview: db.campaigns.filter(
      (c) => c.status === "pending_review",
    ).length,
  });
}
