import "server-only";
import { Prisma } from "@prisma/client";
import type { CampaignStatus, Platform, TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LIMITS } from "@/lib/constants";
import {
  getFollowerCount,
  getInstagramFollowerCount,
  instagramUrl,
  pageUrl,
} from "@/lib/facebook";
import { channelUrl, resolveChannelId } from "@/lib/youtube";
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
   * Connected page to verify against, for the platforms that can only be
   * counted: a Facebook page, or the Instagram business account behind one.
   * With it the campaign runs hands-off. YouTube needs nothing here — the
   * channel is read straight out of `targetUrl`.
   */
  pageId?: string;
}

/**
 * What makes a campaign run without a human: where workers are sent, and how
 * their submissions will be settled.
 */
interface AutoTarget {
  /** Canonical link, so workers always land on the account being measured. */
  targetUrl: string;
  /** Count-checked platforms: the connected page and its starting count. */
  pageId?: string;
  baselineFollowers?: number;
  /** Directly-checked platforms: the account we will ask about. */
  targetRef?: string;
}

/**
 * Resolves how a new campaign will be verified, or null when it cannot be —
 * in which case it simply joins the manual review queue rather than failing
 * the buyer's launch. A network hiccup at the wrong moment costs a review, not
 * a campaign.
 */
async function resolveAutoTarget(
  buyerId: string,
  input: CreateCampaignInput,
  autoVerify: boolean,
): Promise<AutoTarget | null> {
  if (!autoVerify) return null;

  // YouTube is the one platform that answers per worker, so it needs nothing
  // connected: resolve the channel out of the link the buyer pasted and the
  // subscription check does the rest.
  if (input.platform === "youtube" && input.type === "subscribe") {
    try {
      const channel = await resolveChannelId(input.targetUrl);
      if (!channel) return null;
      return { targetUrl: channelUrl(channel), targetRef: channel.channelId };
    } catch (e) {
      console.error("[youtube] channel lookup failed:", (e as Error).message);
      return null;
    }
  }

  // Facebook and Instagram can only be counted, and a count needs an account
  // we hold a token for.
  if (!input.pageId || input.type !== "follow") return null;
  if (input.platform !== "facebook" && input.platform !== "instagram") return null;

  const page = await prisma.facebookPage.findUnique({ where: { id: input.pageId } });
  if (!page || page.ownerId !== buyerId) {
    throw new DomainError("That page is not connected to your account");
  }

  if (input.platform === "instagram") {
    if (!page.instagramId) {
      throw new DomainError(
        "That page has no Instagram business account attached to it",
      );
    }
    try {
      const baseline = await getInstagramFollowerCount(
        page.instagramId,
        page.accessToken,
      );
      await prisma.facebookPage.update({
        where: { id: page.id },
        data: {
          instagramFollowers: baseline,
          lastCheckedAt: new Date(),
          lastError: null,
        },
      });
      return {
        targetUrl: instagramUrl(page.instagramUsername ?? page.instagramId),
        pageId: page.id,
        baselineFollowers: baseline,
      };
    } catch (e) {
      console.error("[instagram] baseline read failed:", (e as Error).message);
      return null;
    }
  }

  try {
    const baseline = await getFollowerCount(page.pageId, page.accessToken);
    await prisma.facebookPage.update({
      where: { id: page.id },
      data: { followers: baseline, lastCheckedAt: new Date(), lastError: null },
    });
    return { targetUrl: pageUrl(page), pageId: page.id, baselineFollowers: baseline };
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
        // An auto-verified campaign points at the resolved account itself, so
        // the link workers open always belongs to what is being measured.
        targetUrl: auto ? auto.targetUrl : input.targetUrl.trim(),
        pageId: auto?.pageId ?? null,
        baselineFollowers: auto?.baselineFollowers ?? null,
        targetRef: auto?.targetRef ?? null,
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

  // Nothing to review: the platform itself is the reviewer.
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
