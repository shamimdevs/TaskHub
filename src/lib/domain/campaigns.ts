import "server-only";
import { Prisma } from "@prisma/client";
import type { CampaignStatus, Platform, TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LIMITS } from "@/lib/constants";
import { getFollowerCount, pageUrl } from "@/lib/facebook";
import { getSettings, getRate } from "./settings";
import { postTransaction } from "./wallet";
import { DomainError } from "./errors";

const VERB: Record<TaskType, string> = {
  follow: "Follow",
  like: "Like the post",
  subscribe: "Subscribe to",
  comment: "Leave a genuine comment on",
  share: "Share the post",
  join_group: "Join the group",
  view: "Watch the video on",
  watch_time: "Watch at least an hour of",
};

function buildInstructions(type: TaskType): string[] {
  return [
    "Open the link in your browser or app",
    "Log in with your real, active account",
    `${VERB[type]} the target page`,
    "Take a screenshot showing it's done",
    "Paste your profile link and submit proof",
  ];
}

export interface CreateCampaignInput {
  platform: Platform;
  type: TaskType;
  title: string;
  targetUrl: string;
  quantity: number;
  note?: string;
  /**
   * Connected Facebook page to verify against. Only meaningful for a
   * facebook + follow campaign; with it the campaign runs hands-off.
   */
  pageId?: string;
}

/**
 * Resolves the auto-verification target for a new campaign: the connected page
 * and the follower count it starts from. Returns null when the campaign is not
 * eligible, or when Facebook cannot be reached — in which case the campaign
 * simply falls back to the manual review queue rather than failing.
 */
async function resolveAutoTarget(
  buyerId: string,
  input: CreateCampaignInput,
  autoVerify: boolean,
) {
  if (!autoVerify || !input.pageId) return null;
  if (input.platform !== "facebook" || input.type !== "follow") return null;

  const page = await prisma.facebookPage.findUnique({ where: { id: input.pageId } });
  if (!page || page.ownerId !== buyerId) {
    throw new DomainError("That Facebook page is not connected to your account");
  }

  try {
    const baseline = await getFollowerCount(page.pageId, page.accessToken);
    await prisma.facebookPage.update({
      where: { id: page.id },
      data: { followers: baseline, lastCheckedAt: new Date(), lastError: null },
    });
    return { page, baseline };
  } catch (e) {
    console.error("[facebook] baseline read failed:", (e as Error).message);
    return null;
  }
}

export async function createCampaign(
  buyer: { id: string; name: string },
  input: CreateCampaignInput,
) {
  const settings = await getSettings();
  const quantity = Math.max(LIMITS.minCampaignQty, Math.floor(input.quantity));
  if (quantity > LIMITS.maxCampaignQty) throw new DomainError("Quantity too large");

  const auto = await resolveAutoTarget(buyer.id, input, settings.autoVerify);

  // One rate per platform + action, paid by the buyer and earned by the worker.
  const rate = await getRate(input.platform, input.type);
  const workerReward = rate;
  const totalCost = new Prisma.Decimal(rate).times(quantity).toDecimalPlaces(2);

  const campaign = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        buyerId: buyer.id,
        buyerName: buyer.name,
        platform: input.platform,
        type: input.type,
        title: input.title.trim() || "Untitled campaign",
        // An auto-verified campaign points at the connected page itself, so
        // the link workers open always belongs to the account being measured.
        targetUrl: auto ? pageUrl(auto.page) : input.targetUrl.trim(),
        pageId: auto?.page.id ?? null,
        baselineFollowers: auto?.baseline ?? null,
        quantity,
        ratePerAction: new Prisma.Decimal(rate),
        workerReward: new Prisma.Decimal(workerReward),
        totalCost,
        status: "pending_review",
        holdDays: settings.holdDays,
        note: input.note?.trim() || null,
      },
    });

    await postTransaction({
      tx,
      userId: buyer.id,
      type: "campaign_spend",
      direction: "debit",
      amount: totalCost,
      description: `Campaign funded — ${campaign.title}`,
      reference: campaign.id,
    });

    return campaign;
  });

  // Nothing to review: the follower count is the reviewer.
  if (auto) return reviewCampaign(campaign.id, "active");
  return campaign;
}

/** Admin campaign state transitions. `target` is the desired CampaignStatus. */
export async function reviewCampaign(id: string, target: CampaignStatus) {
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({ where: { id } });
    if (!campaign) throw new DomainError("Campaign not found", 404);

    const from = campaign.status;
    const remaining = Math.max(0, campaign.quantity - campaign.delivered);

    if (target === "active" && (from === "pending_review" || from === "paused")) {
      const existing = await tx.task.findFirst({ where: { campaignId: id } });
      if (!existing) {
        await tx.task.create({
          data: {
            campaignId: id,
            platform: campaign.platform,
            type: campaign.type,
            title: campaign.title,
            targetUrl: campaign.targetUrl,
            instructions: buildInstructions(campaign.type),
            reward: campaign.workerReward,
            holdDays: campaign.holdDays,
            slotsLeft: remaining,
            buyerName: campaign.buyerName,
            expiresAt: new Date(Date.now() + 21 * 86_400_000),
          },
        });
      } else {
        await tx.task.updateMany({ where: { campaignId: id }, data: { slotsLeft: remaining } });
      }
    }

    if (target === "paused" && from === "active") {
      await tx.task.updateMany({ where: { campaignId: id }, data: { slotsLeft: 0 } });
    }

    if ((target === "rejected" || target === "cancelled") && from !== "rejected" && from !== "cancelled") {
      // Refund the undelivered portion.
      const refund =
        target === "rejected"
          ? campaign.totalCost
          : campaign.ratePerAction.times(remaining).toDecimalPlaces(2);
      if (refund.gt(0)) {
        await postTransaction({
          tx,
          userId: campaign.buyerId,
          type: "adjustment",
          direction: "credit",
          amount: refund,
          description:
            target === "rejected"
              ? `Campaign rejected — refund for "${campaign.title}"`
              : `Campaign cancelled — refund for "${campaign.title}"`,
          reference: campaign.id,
        });
      }
      await tx.task.updateMany({ where: { campaignId: id }, data: { slotsLeft: 0 } });
    }

    return tx.campaign.update({ where: { id }, data: { status: target } });
  });
}
