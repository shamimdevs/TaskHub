/**
 * In-memory mock store for the frontend design pass.
 * Mutations persist for the lifetime of the dev server process, so flows like
 * "create campaign -> see it in the list" work. Restarting `next dev` resets it.
 * Replace with real DB access in the backend phase.
 */
import {
  campaigns as seedCampaigns,
  currentUsers,
  deposits as seedDeposits,
  kpis as seedKpis,
  notifications as seedNotifications,
  referrals as seedReferrals,
  submissions as seedSubmissions,
  tasks as seedTasks,
  users as seedUsers,
  walletTransactions,
  withdrawals as seedWithdrawals,
} from "@/lib/mock";
import { FEES, LIMITS, PRICING } from "@/lib/constants";
import type {
  Campaign,
  Deposit,
  Notification,
  PlatformSettings,
  Role,
  Submission,
  Task,
  User,
  WalletTransaction,
  Withdrawal,
} from "@/types";

interface Db {
  users: User[];
  campaigns: Campaign[];
  tasks: Task[];
  submissions: Submission[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  notifications: Notification[];
  wallets: Record<string, WalletTransaction[]>;
  settings: PlatformSettings;
}

// Reuse a single instance across hot reloads.
const g = globalThis as unknown as { __taskhubDb?: Db };

export const db: Db =
  g.__taskhubDb ??
  (g.__taskhubDb = {
    users: structuredClone(seedUsers),
    campaigns: structuredClone(seedCampaigns),
    tasks: structuredClone(seedTasks),
    submissions: structuredClone(seedSubmissions),
    deposits: structuredClone(seedDeposits),
    withdrawals: structuredClone(seedWithdrawals),
    notifications: [
      ...seedNotifications("me-worker"),
      ...seedNotifications("me-buyer"),
    ],
    wallets: {
      worker: walletTransactions(currentUsers.worker.id),
      buyer: walletTransactions(currentUsers.buyer.id),
      admin: [],
    },
    settings: {
      clientRatePer1k: PRICING.clientRatePer1k,
      workerRewardPerAction: PRICING.workerRewardPerAction,
      minWithdraw: LIMITS.minWithdraw,
      withdrawFeePct: FEES.withdrawFeePct,
      holdDays: LIMITS.holdDaysDefault,
      referralBonus: LIMITS.referralBonus,
      autoApproveDeposits: false,
      maintenanceMode: false,
    },
  });

export const kpis = seedKpis;
export const referralPeople = seedReferrals;
export { currentUsers };

export function roleFromRequest(req: Request): Role {
  const r = req.headers.get("x-role");
  return r === "buyer" || r === "admin" || r === "worker" ? r : "worker";
}

export function me(role: Role): User {
  return currentUsers[role];
}

export function json<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

/** simulate a little latency so loading states are visible */
export const tick = () => new Promise((r) => setTimeout(r, 220));
