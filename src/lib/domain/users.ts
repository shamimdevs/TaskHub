import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { postTransaction } from "./wallet";
import { DomainError } from "./errors";

type AdminUserAction = "ban" | "unban" | "adjust";

export async function adminUpdateUser(
  id: string,
  action: AdminUserAction,
  opts: { reason?: string; amount?: number } = {},
) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user) throw new DomainError("User not found", 404);
  if (user.role === "admin") throw new DomainError("Admin accounts cannot be modified here", 403);

  if (action === "ban") {
    return prisma.user.update({
      where: { id },
      data: { status: "banned", banReason: opts.reason?.trim() || "Policy violation" },
    });
  }
  if (action === "unban") {
    return prisma.user.update({
      where: { id },
      data: { status: "active", banReason: null },
    });
  }

  // adjust
  const amount = Number(opts.amount);
  if (!Number.isFinite(amount) || amount === 0) throw new DomainError("Adjustment amount required");
  await prisma.$transaction(async (tx) => {
    await postTransaction({
      tx,
      userId: id,
      type: "adjustment",
      direction: amount > 0 ? "credit" : "debit",
      amount: new Prisma.Decimal(Math.abs(amount)),
      description: opts.reason?.trim() || "Manual balance adjustment",
    });
  });
  return prisma.user.findUniqueOrThrow({ where: { id } });
}
