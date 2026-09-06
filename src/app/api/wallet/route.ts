import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json, apiError } from "@/lib/api";
import { releaseDueRewards } from "@/lib/domain/submissions";

export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  await releaseDueRewards();

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: {
      id: true,
      name: true,
      role: true,
      balance: true,
      pendingBalance: true,
      lifetimeEarned: true,
      lifetimeSpent: true,
    },
  });
  if (!user) return apiError(404, "User not found");

  const transactions = await prisma.walletTransaction.findMany({
    where: { userId: auth.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return json({ user, transactions });
}
