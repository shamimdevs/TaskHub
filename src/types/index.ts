/**
 * Domain model for TaskHub.
 * Frontend design pass: these types are shared by the mock API, RTK Query
 * endpoints and every panel. Keep them backend-agnostic.
 */

export type Role = "worker" | "buyer" | "admin";

export type Platform =
  | "facebook"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "twitter";

export type TaskType =
  | "follow"
  | "like"
  | "subscribe"
  | "comment"
  | "share"
  | "join_group";

export type CampaignStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "paused"
  | "completed"
  | "rejected"
  | "cancelled";

export type SubmissionStatus =
  | "pending"
  | "on_hold"
  | "approved"
  | "rejected"
  | "reversed";

export type PaymentStatus = "pending" | "approved" | "rejected" | "paid";

export type PaymentMethod = "bkash" | "nagad" | "rocket" | "manual";

export type TxnType =
  | "deposit"
  | "campaign_spend"
  | "task_reward"
  | "withdrawal"
  | "withdrawal_fee"
  | "referral_bonus"
  | "penalty"
  | "adjustment";

export type TxnDirection = "credit" | "debit";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  avatarUrl?: string;
  country: string;
  balance: number;
  pendingBalance: number;
  lifetimeEarned?: number;
  lifetimeSpent?: number;
  status: "active" | "banned" | "restricted";
  banReason?: string;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface Campaign {
  id: string;
  buyerId: string;
  buyerName: string;
  platform: Platform;
  type: TaskType;
  title: string;
  targetUrl: string;
  quantity: number;
  delivered: number;
  ratePerAction: number; // what the buyer pays per action
  workerReward: number; // what a worker earns per action
  totalCost: number;
  status: CampaignStatus;
  holdDays: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  campaignId: string;
  platform: Platform;
  type: TaskType;
  title: string;
  targetUrl: string;
  instructions: string[];
  reward: number;
  holdDays: number;
  slotsLeft: number;
  buyerName: string;
  postedAt: string;
  expiresAt?: string;
}

export interface Submission {
  id: string;
  taskId: string;
  campaignId: string;
  workerId: string;
  workerName: string;
  platform: Platform;
  type: TaskType;
  title: string;
  reward: number;
  status: SubmissionStatus;
  proofUrl?: string;
  proofNote?: string;
  screenshotUrl?: string;
  submittedAt: string;
  holdUntil: string;
  reviewedAt?: string;
  reviewerNote?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: TxnType;
  direction: TxnDirection;
  amount: number;
  balanceAfter: number;
  status: "completed" | "pending" | "reversed";
  reference?: string;
  description: string;
  createdAt: string;
}

export interface Deposit {
  id: string;
  buyerId: string;
  buyerName: string;
  method: PaymentMethod;
  senderNumber: string;
  trxId: string;
  amount: number;
  status: PaymentStatus;
  note?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface Withdrawal {
  id: string;
  workerId: string;
  workerName: string;
  method: PaymentMethod;
  accountNumber: string;
  amount: number;
  fee: number;
  net: number;
  status: PaymentStatus;
  note?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  kind: "info" | "success" | "warning" | "danger";
  read: boolean;
  href?: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  name: string;
  joinedAt: string;
  status: "joined" | "active" | "qualified";
  earnedForYou: number;
}

export interface AdminKpis {
  grossRevenue: number;
  netProfit: number;
  marginPct: number;
  payoutsPaid: number;
  totalUsers: number;
  activeWorkers: number;
  activeBuyers: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  submissionsOnHold: number;
  campaignsAwaitingReview: number;
  revenueSeries: { label: string; revenue: number; payout: number }[];
}

export interface PlatformSettings {
  clientRatePer1k: number;
  workerRewardPerAction: number;
  minWithdraw: number;
  withdrawFeePct: number;
  holdDays: number;
  referralBonus: number;
  autoApproveDeposits: boolean;
  maintenanceMode: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
