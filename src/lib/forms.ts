import { z } from "zod";
import { LIMITS } from "@/lib/constants";
import { platformSchema, taskTypeSchema } from "@/lib/validation";

/**
 * What the browser validates as someone types, for React Hook Form.
 *
 * The server checks every request again in `src/lib/validation.ts` — these
 * schemas exist to say what is wrong *before* a round trip, so unlike the API
 * ones every message here is written to be read by the person filling the form.
 */

const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("That does not look like an email address");

/**
 * Login and register share a component, so they share a shape: the extra
 * fields are optional in the type and required by the refinement only when
 * signing up.
 */
export function authSchema(mode: "login" | "register") {
  return z
    .object({
      email,
      password:
        mode === "register"
          ? z.string().min(8, "Use at least 8 characters")
          : z.string().min(1, "Enter your password"),
      name: z.string().trim().max(80, "That name is too long").optional(),
      role: z.enum(["worker", "buyer"]).optional(),
      referral: z.string().trim().max(24, "That code is too long").optional(),
    })
    .superRefine((values, ctx) => {
      if (mode !== "register") return;
      if (!values.name || values.name.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["name"],
          message: "Tell us your name",
        });
      }
      if (!values.role) {
        ctx.addIssue({
          code: "custom",
          path: ["role"],
          message: "Pick what you want to do",
        });
      }
    });
}

export type AuthValues = z.infer<ReturnType<typeof authSchema>>;

const isUrl = (value: string) => z.string().url().safeParse(value).success;

export const campaignFormSchema = z
  .object({
    platform: platformSchema,
    type: taskTypeSchema,
    title: z
      .string()
      .trim()
      .min(3, "Give the campaign a title of at least 3 characters")
      .max(120, "Keep the title under 120 characters"),
    // Empty is allowed here and refused below, because a connected page is its
    // own target and leaves nothing to paste.
    targetUrl: z.string().trim().max(500, "That link is too long"),
    // Registered with valueAsNumber, so an empty box arrives as NaN.
    quantity: z
      .number({ error: "Enter how many you want" })
      .int("Whole numbers only")
      .min(LIMITS.minCampaignQty, `The smallest campaign is ${LIMITS.minCampaignQty}`)
      .max(LIMITS.maxCampaignQty, "That is more than we can deliver"),
    note: z.string().trim().max(600, "Keep instructions under 600 characters"),
    pageId: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.pageId) return;
    if (!values.targetUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["targetUrl"],
        message: "Paste the link workers should open",
      });
    } else if (!isUrl(values.targetUrl)) {
      ctx.addIssue({
        code: "custom",
        path: ["targetUrl"],
        message: "That is not a valid link — include https://",
      });
    }
  });

export type CampaignValues = z.infer<typeof campaignFormSchema>;

/** Changing a password you already have — the current one proves it is you. */
export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string().min(1, "Type the new password again"),
  })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    message: "Those passwords do not match",
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** First password for an account that has only ever used Google. */
export const setPasswordSchema = z
  .object({
    next: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string().min(1, "Type the password again"),
  })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    message: "Those passwords do not match",
  });

export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
