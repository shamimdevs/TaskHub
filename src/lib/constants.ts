import type {
  CampaignStatus,
  Platform,
  PaymentMethod,
  PaymentStatus,
  SubmissionStatus,
  TaskType,
  TxnType,
} from "@/types";

export const APP_NAME = "TaskHub";
export const APP_TAGLINE = "Earn from your phone. Grow with real people.";

/** Public support / contact details. Replace with real values before launch. */
export const SUPPORT = {
  email: "support@taskhub.com.bd",
  phone: "+880 1700-000000",
  hours: "Sun–Thu, 10:00–19:00 (BST)",
  responseTime: "within 2 business days",
  address: "Dhaka, Bangladesh",
} as const;

/**
 * Every price, balance, reward and payout on the platform is US dollars, and
 * that is the only currency the UI shows. Local cash (bKash / Nagad taka) is
 * converted at `PlatformSettings.usdRate` and appears on exactly two screens:
 * deposit and withdraw.
 */
export const USD_RATE = 120;

/**
 * Default price per action, in USD, by platform and action. The buyer pays it
 * and the worker earns it — the platform keeps nothing here, only the
 * withdrawal commission in `FEES`. Admins edit these live in the rate card;
 * these values only seed a fresh install.
 *
 * `watch_time` is priced per hour, `view` per view, everything else per action.
 */
export const RATE_CARD: Record<Platform, Partial<Record<TaskType, number>>> = {
  facebook: {
    follow: 0.01,
    like: 0.005,
    comment: 0.02,
    share: 0.012,
    join_group: 0.015,
  },
  instagram: {
    follow: 0.012,
    like: 0.006,
    comment: 0.022,
    share: 0.014,
  },
  youtube: {
    subscribe: 0.02,
    like: 0.008,
    comment: 0.025,
    view: 0.003,
    watch_time: 0.08,
  },
  tiktok: {
    follow: 0.011,
    like: 0.005,
    comment: 0.02,
    share: 0.012,
    view: 0.002,
  },
  twitter: {
    follow: 0.012,
    like: 0.006,
    comment: 0.022,
    share: 0.012,
  },
};

/** Every (platform, action) pair the rate card covers, in a stable order. */
export const RATE_CARD_ENTRIES = (Object.keys(RATE_CARD) as Platform[]).flatMap(
  (platform) =>
    (Object.keys(RATE_CARD[platform]) as TaskType[]).map((type) => ({
      platform,
      type,
      rate: RATE_CARD[platform][type]!,
    })),
);

/** Cheapest and dearest default action — used in public pricing copy. */
export const RATE_RANGE = {
  min: Math.min(...RATE_CARD_ENTRIES.map((e) => e.rate)),
  max: Math.max(...RATE_CARD_ENTRIES.map((e) => e.rate)),
};

/** The platform's only commission: deducted when a worker withdraws. */
export const FEES = {
  withdrawFeePct: 5,
} as const;

/** All USD — `minDeposit` is what a top-up has to be worth to be credited. */
export const LIMITS = {
  minWithdraw: 1,
  minDeposit: 1,
  minCampaignQty: 100,
  maxCampaignQty: 1_000_000,
  holdDaysDefault: 4,
  holdDaysRange: [3, 5] as const,
  referralBonus: 0.05,
} as const;

/**
 * What a platform calls its audience number — the one a campaign's baseline is
 * a reading of.
 */
export const AUDIENCE_NOUN: Record<Platform, string> = {
  facebook: "followers",
  instagram: "followers",
  youtube: "subscribers",
  tiktok: "followers",
  twitter: "followers",
};

export const PLATFORMS: Record<
  Platform,
  { label: string; color: string; actions: TaskType[] }
> = {
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    actions: ["follow", "like", "comment", "share", "join_group"],
  },
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    actions: ["follow", "like", "comment", "share"],
  },
  youtube: {
    label: "YouTube",
    color: "#FF0000",
    actions: ["subscribe", "like", "comment", "view", "watch_time"],
  },
  tiktok: {
    label: "TikTok",
    color: "#010101",
    actions: ["follow", "like", "comment", "share", "view"],
  },
  twitter: {
    label: "X (Twitter)",
    color: "#0F1419",
    actions: ["follow", "like", "comment", "share"],
  },
};

export const TASK_TYPES: Record<
  TaskType,
  { label: string; verb: string; unit: string }
> = {
  follow: { label: "Follow", verb: "Follow the page", unit: "follows" },
  like: { label: "Like", verb: "Like the post", unit: "likes" },
  subscribe: {
    label: "Subscribe",
    verb: "Subscribe to the channel",
    unit: "subscribers",
  },
  comment: { label: "Comment", verb: "Leave a genuine comment", unit: "comments" },
  share: { label: "Share", verb: "Share the post", unit: "shares" },
  join_group: { label: "Join group", verb: "Join the group", unit: "members" },
  view: { label: "View", verb: "Watch the video", unit: "views" },
  watch_time: {
    label: "Watch time",
    verb: "Watch the video for at least an hour",
    unit: "hours",
  },
};

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

export const CAMPAIGN_STATUS: Record<
  CampaignStatus,
  { label: string; tone: Tone }
> = {
  draft: { label: "Draft", tone: "neutral" },
  pending_review: { label: "Pending review", tone: "warning" },
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "info" },
  completed: { label: "Completed", tone: "brand" },
  rejected: { label: "Rejected", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const SUBMISSION_STATUS: Record<
  SubmissionStatus,
  { label: string; tone: Tone }
> = {
  pending: { label: "Pending", tone: "warning" },
  on_hold: { label: "On hold", tone: "info" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  reversed: { label: "Reversed", tone: "danger" },
};

export const PAYMENT_STATUS: Record<
  PaymentStatus,
  { label: string; tone: Tone }
> = {
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  paid: { label: "Paid", tone: "brand" },
};

export const PAYMENT_METHODS: Record<
  PaymentMethod,
  { label: string; number: string; color: string }
> = {
  bkash: { label: "bKash", number: "017XX-XXXXXX", color: "#E2136E" },
  nagad: { label: "Nagad", number: "018XX-XXXXXX", color: "#F6921E" },
  rocket: { label: "Rocket", number: "019XX-XXXXXX", color: "#8C3494" },
  manual: { label: "Manual", number: "—", color: "#667085" },
};

export const TXN_LABELS: Record<TxnType, string> = {
  deposit: "Deposit",
  campaign_spend: "Campaign spend",
  task_reward: "Task reward",
  withdrawal: "Withdrawal",
  withdrawal_fee: "Withdrawal fee",
  referral_bonus: "Referral bonus",
  penalty: "Penalty",
  adjustment: "Adjustment",
};
