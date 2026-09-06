import { z } from "zod";

export const platformSchema = z.enum([
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "twitter",
]);

export const taskTypeSchema = z.enum([
  "follow",
  "like",
  "subscribe",
  "comment",
  "share",
  "join_group",
  "view",
  "watch_time",
]);

export const paymentMethodSchema = z.enum(["bkash", "nagad", "rocket", "manual"]);

export const campaignStatusSchema = z.enum([
  "draft",
  "pending_review",
  "active",
  "paused",
  "completed",
  "rejected",
  "cancelled",
]);

/* ------------------------------ bodies ---------------------------- */

export const createCampaignSchema = z.object({
  platform: platformSchema,
  type: taskTypeSchema,
  title: z.string().trim().min(3).max(120),
  targetUrl: z.string().trim().url().max(500),
  quantity: z.number().int().positive().max(1_000_000),
  note: z.string().trim().max(600).optional(),
  /** Connected Facebook page to verify against (facebook + follow only). */
  pageId: z.string().min(1).optional(),
});

export const updateCampaignSchema = z.object({
  status: campaignStatusSchema,
});

export const createDepositSchema = z.object({
  method: paymentMethodSchema,
  senderNumber: z.string().trim().min(6).max(20),
  trxId: z.string().trim().min(4).max(40),
  /** What the buyer sent over bKash/Nagad, in taka. */
  amountBdt: z.number().positive().max(10_000_000),
});

export const reviewDepositSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(400).optional(),
});

export const createWithdrawalSchema = z.object({
  method: paymentMethodSchema,
  accountNumber: z.string().trim().min(6).max(20),
  amount: z.number().positive().max(10_000_000),
});

export const reviewWithdrawalSchema = z.object({
  action: z.enum(["approve", "reject", "markPaid"]),
  note: z.string().trim().max(400).optional(),
});

export const createSubmissionSchema = z.object({
  taskId: z.string().min(1),
  proofUrl: z.string().trim().url().max(500),
  proofNote: z.string().trim().max(600).optional(),
  screenshotUrl: z.string().trim().url().max(500).optional(),
});

export const reviewSubmissionSchema = z.object({
  action: z.enum(["approve", "reject", "penalize"]),
  note: z.string().trim().max(400).optional(),
});

/** The one-time worker/buyer pick made at /setup-role. */
export const setRoleSchema = z.object({
  role: z.enum(["worker", "buyer"]),
});

export const updateUserSchema = z.object({
  action: z.enum(["ban", "unban", "adjust"]),
  reason: z.string().trim().max(400).optional(),
  amount: z.number().optional(),
});

/** Profile link a worker supplies when Facebook did not return one. */
export const setProfileUrlSchema = z.object({
  profileUrl: z.string().trim().url().max(500),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10).max(4000),
});

export const rateCardEntrySchema = z.object({
  platform: platformSchema,
  type: taskTypeSchema,
  rate: z.number().min(0).max(1000),
  enabled: z.boolean().optional(),
});

export const updateSettingsSchema = z.object({
  /** BDT per 1 USD. */
  usdRate: z.number().positive().max(100_000).optional(),
  minDeposit: z.number().positive().optional(),
  minWithdraw: z.number().positive().optional(),
  withdrawFeePct: z.number().min(0).max(100).optional(),
  holdDays: z.number().int().min(0).max(60).optional(),
  referralBonus: z.number().min(0).optional(),
  autoApproveDeposits: z.boolean().optional(),
  autoVerify: z.boolean().optional(),
  autoVerifyGraceMins: z.number().int().min(0).max(1440).optional(),
  maintenanceMode: z.boolean().optional(),
  /** Per-platform, per-action prices to upsert. */
  rates: z.array(rateCardEntrySchema).max(100).optional(),
});
