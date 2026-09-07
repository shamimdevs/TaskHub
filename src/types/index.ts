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
  | "join_group"
  | "view"
  | "watch_time";

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
  /** Set when the campaign is checked automatically against a connected page. */
  pageId?: string | null;
  baselineFollowers?: number | null;
  /**
   * The target's own id on the platform, when it can be asked directly whether
   * a given worker followed — a YouTube channel id today.
   */
  targetRef?: string | null;
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
  /** Cleared by the follower-count checker rather than a person. */
  autoVerified?: boolean;
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
  /** What the buyer sent over bKash/Nagad, in BDT. */
  amountBdt: number;
  /** BDT per 1 USD, locked when the deposit was submitted. */
  usdRate: number;
  /** What lands in the wallet, in USD. */
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
  /** Requested, fee and net are USD — the wallet currency. */
  amount: number;
  fee: number;
  net: number;
  /** BDT per 1 USD, locked when the request was made. */
  usdRate: number;
  /** What the admin sends to the bKash/Nagad number, in BDT. */
  payoutBdt: number;
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
  /** Withdrawal commission collected — the platform's only income. */
  commissionEarned: number;
  /** Commission rate currently charged on a withdrawal, in percent. */
  withdrawFeePct: number;
  /** Buyer money that flowed through the platform, passed on to workers. */
  platformVolume: number;
  payoutsPaid: number;
  totalUsers: number;
  activeWorkers: number;
  activeBuyers: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  submissionsOnHold: number;
  campaignsAwaitingReview: number;
  commissionSeries: { label: string; commission: number; payout: number }[];
}

/** One editable price per platform + action, in USD. */
export interface RateCardEntry {
  platform: Platform;
  type: TaskType;
  rate: number;
  enabled: boolean;
}

export interface PlatformSettings {
  /** BDT per 1 USD. The admin can change this at any time. */
  usdRate: number;
  minDeposit: number;
  minWithdraw: number;
  withdrawFeePct: number;
  holdDays: number;
  referralBonus: number;
  autoApproveDeposits: boolean;
  /** Hands-off auto-verified campaigns: no review, automatically settled. */
  autoVerify: boolean;
  /** Minutes a submission waits for the platform to confirm it. */
  autoVerifyGraceMins: number;
  maintenanceMode: boolean;
}

/** How a worker's linked account came to be attached to their account. */
export type LinkMethod = "oauth" | "code" | "claimed";

/** A worker's linked social account. Tokens never reach the client. */
export interface SocialAccount {
  id: string;
  provider: Platform;
  name: string;
  username?: string | null;
  profileUrl?: string | null;
  linkMethod: LinkMethod;
  /** True once the provider itself confirmed the account. */
  verified: boolean;
  /** True when the provider can be asked directly about this worker. */
  autoCheckable: boolean;
  /** Set while a claim waits for its code to appear on the public profile. */
  verifyCode?: string | null;
  /** Whether that wait can ever end on this server. */
  codeVerifiable: boolean;
  lastError?: string | null;
  connectedAt: string;
}

/** What `GET /api/settings` returns: the singleton plus the rate card. */
export interface SettingsPayload extends PlatformSettings {
  rates: RateCardEntry[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
