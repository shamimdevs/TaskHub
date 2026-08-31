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

/** Core business rules from the brief. */
export const PRICING = {
  /** Buyer pays per 1,000 followers/actions. */
  clientRatePer1k: 300,
  /** Buyer pays per single action. */
  clientRatePerAction: 0.3,
  /** Worker earns per completed action. */
  workerRewardPerAction: 0.15,
  /** Gross margin the platform keeps. */
  grossMarginPct: 50,
} as const;

export const FEES = {
  withdrawFeePct: 5,
} as const;

export const LIMITS = {
  minWithdraw: 50,
  minDeposit: 100,
  minCampaignQty: 100,
  maxCampaignQty: 1_000_000,
  holdDaysDefault: 4,
  holdDaysRange: [3, 5] as const,
  referralBonus: 5,
} as const;

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
    actions: ["subscribe", "like", "comment"],
  },
  tiktok: {
    label: "TikTok",
    color: "#010101",
    actions: ["follow", "like", "comment", "share"],
  },
  twitter: {
    label: "X (Twitter)",
    color: "#0F1419",
    actions: ["follow", "like", "share"],
  },
};

export const TASK_TYPES: Record<TaskType, { label: string; verb: string }> = {
  follow: { label: "Follow", verb: "Follow the page" },
  like: { label: "Like", verb: "Like the post" },
  subscribe: { label: "Subscribe", verb: "Subscribe to the channel" },
  comment: { label: "Comment", verb: "Leave a genuine comment" },
  share: { label: "Share", verb: "Share the post" },
  join_group: { label: "Join group", verb: "Join the group" },
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
