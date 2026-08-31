/**
 * Deterministic mock dataset for the frontend design pass.
 * Everything the mock API (`src/app/api/**`) serves is generated here.
 * Swap this module for real DB queries in the backend phase.
 */
import { FEES, LIMITS, PRICING } from "@/lib/constants";
import type {
  AdminKpis,
  Campaign,
  CampaignStatus,
  Deposit,
  Notification,
  PaymentMethod,
  Platform,
  Referral,
  Submission,
  SubmissionStatus,
  Task,
  TaskType,
  User,
  WalletTransaction,
  Withdrawal,
} from "@/types";

/* --------------------------------- rng ---------------------------------- */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let tt = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    tt = (tt + Math.imul(tt ^ (tt >>> 7), 61 | tt)) ^ tt;
    return ((tt ^ (tt >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20240831);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const int = (min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();
const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 3_600_000).toISOString();
const daysAhead = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString();

/* -------------------------------- names -------------------------------- */
const FIRST = [
  "Rakib", "Sadia", "Tanvir", "Mitu", "Jubayer", "Nusrat", "Sabbir", "Farhana",
  "Imran", "Lamia", "Shakil", "Priya", "Nayeem", "Rima", "Arif", "Sumaiya",
  "Hasib", "Tania", "Fahim", "Jannat",
];
const LAST = [
  "Hasan", "Akter", "Islam", "Chowdhury", "Rahman", "Ahmed", "Khan", "Sarker",
  "Hossain", "Begum", "Mia", "Das",
];
const fullName = () => `${pick(FIRST)} ${pick(LAST)}`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

const PLATFORMS: Platform[] = [
  "facebook", "instagram", "youtube", "tiktok", "twitter",
];
const TYPES: TaskType[] = ["follow", "like", "subscribe", "comment", "share"];

/* -------------------------------- users -------------------------------- */
export const users: User[] = Array.from({ length: 42 }).map((_, i) => {
  const name = fullName();
  const role =
    i === 0 ? "worker" : i === 1 ? "buyer" : i === 2 ? "admin" : i % 3 === 0 ? "buyer" : "worker";
  const earned = role === "worker" ? int(120, 9800) : 0;
  const spent = role === "buyer" ? int(300, 42000) : 0;
  return {
    id: `u_${i + 1}`,
    name,
    email: `${slug(name)}${i}@gmail.com`,
    phone: `01${int(3, 9)}${int(10_000_000, 99_999_999)}`,
    role,
    country: "Bangladesh",
    balance:
      role === "worker" ? int(0, 1400) : role === "buyer" ? int(0, 8000) : 0,
    pendingBalance: role === "worker" ? int(0, 600) : 0,
    lifetimeEarned: earned,
    lifetimeSpent: spent,
    status: i === 7 ? "banned" : i === 11 ? "restricted" : "active",
    banReason: i === 7 ? "Unfollowed after reward was paid (x3)" : undefined,
    referralCode: `${slug(name).slice(0, 5).toUpperCase()}${int(100, 999)}`,
    createdAt: daysAgo(int(1, 240)),
    lastActiveAt: hoursAgo(int(0, 72)),
  };
});

export const currentUsers: Record<string, User> = {
  worker: {
    ...users[0],
    name: "Rakib Hasan",
    email: "rakib.hasan@gmail.com",
    phone: "01712345678",
    referralCode: "RAKIB742",
    balance: 742.5,
    pendingBalance: 315,
    lifetimeEarned: 8460,
    lifetimeSpent: 0,
  },
  buyer: {
    ...users[1],
    name: "Sadia Akter",
    email: "sadia.akter@gmail.com",
    phone: "01898765432",
    referralCode: "SADIA530",
    balance: 5230,
    pendingBalance: 0,
    lifetimeSpent: 38900,
  },
  admin: {
    ...users[2],
    name: "Admin",
    email: "admin@taskhub.app",
    phone: "01700000000",
    referralCode: "ADMIN001",
  },
};

/* ------------------------------ campaigns ------------------------------ */
const CAMPAIGN_TITLES = [
  "Grow my clothing brand page",
  "Boost new music video",
  "Restaurant page followers",
  "Tech review channel subs",
  "Fitness coach Instagram",
  "Startup launch buzz",
  "Photography portfolio",
  "Local news page",
  "Gaming channel growth",
  "Handmade crafts shop",
];

export const campaigns: Campaign[] = Array.from({ length: 14 }).map((_, i) => {
  const platform = PLATFORMS[i % PLATFORMS.length];
  const type = platform === "youtube" ? "subscribe" : TYPES[i % TYPES.length];
  const quantity = pick([1000, 2000, 3000, 5000, 500, 1500]);
  const delivered =
    i < 3 ? quantity : i < 9 ? int(0, quantity) : Math.floor(quantity * 0.15);
  const status: CampaignStatus =
    i < 3 ? "completed" : i === 3 ? "pending_review" : i === 4 ? "paused" : i === 13 ? "rejected" : "active";
  return {
    id: `c_${i + 1}`,
    buyerId: i % 2 === 0 ? "u_2" : `u_${5 + (i % 8)}`,
    buyerName: i % 2 === 0 ? "Sadia Akter" : fullName(),
    platform,
    type,
    title: CAMPAIGN_TITLES[i % CAMPAIGN_TITLES.length],
    targetUrl: `https://${platform}.com/${slug(fullName())}`,
    quantity,
    delivered,
    ratePerAction: PRICING.clientRatePerAction,
    workerReward: PRICING.workerRewardPerAction,
    totalCost: +(quantity * PRICING.clientRatePerAction).toFixed(2),
    status,
    holdDays: LIMITS.holdDaysDefault,
    note:
      "Please use a real active account. Do not unfollow — reward is verified after the hold period.",
    createdAt: daysAgo(int(1, 60)),
    updatedAt: daysAgo(int(0, 5)),
  };
});

/* -------------------------------- tasks -------------------------------- */
export const tasks: Task[] = campaigns
  .filter((c) => c.status === "active" && c.delivered < c.quantity)
  .map((c, i) => ({
    id: `t_${i + 1}`,
    campaignId: c.id,
    platform: c.platform,
    type: c.type,
    title: c.title,
    targetUrl: c.targetUrl,
    instructions: [
      "Open the link in your browser or app",
      "Log in with your real, active account",
      `${c.type === "subscribe" ? "Subscribe to" : c.type === "follow" ? "Follow" : "Complete the action on"} the page`,
      "Take a screenshot showing it's done",
      "Paste your profile link and submit proof",
    ],
    reward: c.workerReward,
    holdDays: c.holdDays,
    slotsLeft: c.quantity - c.delivered,
    buyerName: c.buyerName,
    postedAt: hoursAgo(int(1, 96)),
    expiresAt: daysAhead(int(3, 20)),
  }));

/* ----------------------------- submissions ---------------------------- */
const SUB_STATUSES: SubmissionStatus[] = [
  "pending", "on_hold", "on_hold", "approved", "approved", "approved", "rejected",
];
export const submissions: Submission[] = Array.from({ length: 24 }).map((_, i) => {
  const c = campaigns[i % campaigns.length];
  const status = SUB_STATUSES[i % SUB_STATUSES.length];
  const submittedAt = daysAgo(int(0, 12));
  return {
    id: `s_${i + 1}`,
    taskId: `t_${(i % tasks.length) + 1}`,
    campaignId: c.id,
    workerId: i % 4 === 0 ? "u_1" : `u_${10 + (i % 20)}`,
    workerName: i % 4 === 0 ? "Rakib Hasan" : fullName(),
    platform: c.platform,
    type: c.type,
    title: c.title,
    reward: c.workerReward,
    status,
    proofUrl: `https://${c.platform}.com/${slug(fullName())}`,
    proofNote: i % 3 === 0 ? "Done from my main account." : undefined,
    submittedAt,
    holdUntil: daysAhead(status === "on_hold" ? int(1, 3) : -1),
    reviewedAt: status === "pending" ? undefined : daysAgo(int(0, 4)),
    reviewerNote:
      status === "rejected" ? "Screenshot did not match the target page." : undefined,
  };
});

/* ---------------------------- transactions --------------------------- */
export function walletTransactions(userId: string): WalletTransaction[] {
  const isBuyer = currentUsers.buyer.id === userId || userId.startsWith("u_2");
  let balance = isBuyer ? 5230 : 742.5;
  const rows: WalletTransaction[] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const buyerKinds = ["deposit", "campaign_spend"] as const;
    const workerKinds = [
      "task_reward", "task_reward", "task_reward", "withdrawal", "referral_bonus", "penalty",
    ] as const;
    const type = isBuyer ? pick(buyerKinds) : pick(workerKinds);
    const direction =
      type === "deposit" || type === "task_reward" || type === "referral_bonus"
        ? "credit"
        : "debit";
    const amount =
      type === "deposit"
        ? int(500, 5000)
        : type === "campaign_spend"
          ? int(150, 1500)
          : type === "withdrawal"
            ? int(50, 500)
            : type === "referral_bonus"
              ? LIMITS.referralBonus
              : type === "penalty"
                ? PRICING.workerRewardPerAction * int(1, 8)
                : PRICING.workerRewardPerAction * int(1, 6);
    const delta = direction === "credit" ? amount : -amount;
    const balanceAfter = +balance.toFixed(2);
    balance -= delta;
    rows.push({
      id: `w_${userId}_${i + 1}`,
      userId,
      type,
      direction,
      amount: +amount.toFixed(2),
      balanceAfter,
      status: type === "withdrawal" && i < 2 ? "pending" : "completed",
      reference:
        type === "deposit"
          ? `TRX${int(100000, 999999)}`
          : type.startsWith("task") || type === "penalty"
            ? `s_${int(1, 24)}`
            : undefined,
      description:
        type === "deposit"
          ? "bKash deposit approved"
          : type === "campaign_spend"
            ? "Campaign funded"
            : type === "task_reward"
              ? "Task reward released"
              : type === "withdrawal"
                ? "Withdrawal to bKash"
                : type === "referral_bonus"
                  ? "Referral bonus"
                  : "Penalty — reward reversed",
      createdAt: daysAgo(i),
    });
  }
  return rows;
}

/* ------------------------------ deposits ----------------------------- */
const METHODS: PaymentMethod[] = ["bkash", "nagad", "rocket"];
export const deposits: Deposit[] = Array.from({ length: 16 }).map((_, i) => ({
  id: `d_${i + 1}`,
  buyerId: i % 3 === 0 ? "u_2" : `u_${5 + (i % 8)}`,
  buyerName: i % 3 === 0 ? "Sadia Akter" : fullName(),
  method: METHODS[i % METHODS.length],
  senderNumber: `01${int(3, 9)}${int(10_000_000, 99_999_999)}`,
  trxId: `TRX${int(100000, 999999)}`,
  amount: pick([500, 1000, 1500, 2000, 3000, 5000]),
  status: i < 4 ? "pending" : i < 12 ? "approved" : i === 15 ? "rejected" : "approved",
  note: i === 15 ? "TrxID not found in statement" : undefined,
  createdAt: hoursAgo(int(1, 120)),
  reviewedAt: i < 4 ? undefined : hoursAgo(int(0, 100)),
}));

/* ----------------------------- withdrawals -------------------------- */
export const withdrawals: Withdrawal[] = Array.from({ length: 15 }).map((_, i) => {
  const amount = pick([50, 80, 120, 200, 350, 500]);
  const fee = +((amount * FEES.withdrawFeePct) / 100).toFixed(2);
  return {
    id: `x_${i + 1}`,
    workerId: i % 4 === 0 ? "u_1" : `u_${10 + (i % 20)}`,
    workerName: i % 4 === 0 ? "Rakib Hasan" : fullName(),
    method: METHODS[i % METHODS.length],
    accountNumber: `01${int(3, 9)}${int(10_000_000, 99_999_999)}`,
    amount,
    fee,
    net: +(amount - fee).toFixed(2),
    status: i < 5 ? "pending" : i < 11 ? "approved" : i < 14 ? "paid" : "rejected",
    note: i === 14 ? "Account number mismatch" : undefined,
    createdAt: hoursAgo(int(1, 140)),
    reviewedAt: i < 5 ? undefined : hoursAgo(int(0, 120)),
  };
});

/* ------------------------------- kpis ------------------------------- */
export const kpis: AdminKpis = (() => {
  const gross = 486_300;
  const payout = 243_150;
  return {
    grossRevenue: gross,
    netProfit: gross - payout,
    marginPct: PRICING.grossMarginPct,
    payoutsPaid: payout,
    totalUsers: users.length + 1180,
    activeWorkers: 842,
    activeBuyers: 196,
    pendingDeposits: deposits.filter((d) => d.status === "pending").length,
    pendingWithdrawals: withdrawals.filter((w) => w.status === "pending").length,
    submissionsOnHold: submissions.filter((s) => s.status === "on_hold").length,
    campaignsAwaitingReview: campaigns.filter((c) => c.status === "pending_review")
      .length,
    revenueSeries: Array.from({ length: 12 }).map((_, i) => {
      const rev = int(24_000, 52_000);
      return {
        label: new Date(2025, i, 1).toLocaleString("en", { month: "short" }),
        revenue: rev,
        payout: Math.floor(rev * 0.5),
      };
    }),
  };
})();

/* --------------------------- notifications ------------------------- */
export function notifications(userId: string): Notification[] {
  const base: Omit<Notification, "id" | "userId">[] = [
    {
      title: "Reward released",
      body: "৳0.15 for your Instagram follow task passed the hold period.",
      kind: "success",
      read: false,
      href: "/worker/wallet",
      createdAt: hoursAgo(2),
    },
    {
      title: "Proof approved",
      body: "Your YouTube subscribe proof was approved.",
      kind: "success",
      read: false,
      href: "/worker/submissions",
      createdAt: hoursAgo(9),
    },
    {
      title: "New tasks available",
      body: "12 new Facebook follow tasks just went live.",
      kind: "info",
      read: true,
      href: "/worker/tasks",
      createdAt: hoursAgo(26),
    },
    {
      title: "Withdrawal approved",
      body: "৳190 is on its way to your bKash account.",
      kind: "success",
      read: true,
      href: "/worker/withdraw",
      createdAt: daysAgo(2),
    },
    {
      title: "Hold reminder",
      body: "Do not unfollow — 3 rewards are still in the verification window.",
      kind: "warning",
      read: true,
      createdAt: daysAgo(3),
    },
  ];
  return base.map((n, i) => ({ ...n, id: `n_${userId}_${i + 1}`, userId }));
}

/* ----------------------------- referrals -------------------------- */
export const referrals: Referral[] = Array.from({ length: 6 }).map((_, i) => ({
  id: `r_${i + 1}`,
  name: fullName(),
  joinedAt: daysAgo(int(2, 90)),
  status: i < 2 ? "qualified" : i < 4 ? "active" : "joined",
  earnedForYou: i < 2 ? LIMITS.referralBonus : 0,
}));
