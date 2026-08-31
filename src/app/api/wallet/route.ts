import { db, json, me, roleFromRequest, tick } from "@/app/api/_data/db";

export async function GET(req: Request) {
  await tick();
  const role = roleFromRequest(req);
  const user = me(role);
  const transactions = db.wallets[role] ?? [];
  return json({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      balance: user.balance,
      pendingBalance: user.pendingBalance,
      lifetimeEarned: user.lifetimeEarned,
      lifetimeSpent: user.lifetimeSpent,
    },
    transactions,
  });
}
