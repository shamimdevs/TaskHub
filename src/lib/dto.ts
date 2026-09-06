import "server-only";
import type { User as PrismaUser, Task as PrismaTask } from "@prisma/client";
import type { User, Task } from "@/types";

/** Prisma User row -> the client-facing User shape (no auth internals). */
export function toUser(u: PrismaUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? "",
    role: u.role,
    avatarUrl: u.image ?? undefined,
    country: u.country,
    balance: u.balance.toNumber(),
    pendingBalance: u.pendingBalance.toNumber(),
    lifetimeEarned: u.lifetimeEarned.toNumber(),
    lifetimeSpent: u.lifetimeSpent.toNumber(),
    status: u.status,
    banReason: u.banReason ?? undefined,
    referralCode: u.referralCode,
    referredBy: u.referredById ?? undefined,
    createdAt: u.createdAt.toISOString(),
    lastActiveAt: u.lastActiveAt.toISOString(),
  };
}

/** Prisma Task row -> the shape the marketing pages and worker UI render. */
export function toTask(t: PrismaTask): Task {
  return {
    id: t.id,
    campaignId: t.campaignId,
    platform: t.platform,
    type: t.type,
    title: t.title,
    targetUrl: t.targetUrl,
    instructions: t.instructions,
    reward: t.reward.toNumber(),
    holdDays: t.holdDays,
    slotsLeft: t.slotsLeft,
    buyerName: t.buyerName,
    postedAt: t.postedAt.toISOString(),
    expiresAt: t.expiresAt?.toISOString(),
  };
}
