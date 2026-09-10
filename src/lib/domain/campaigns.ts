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
import { formatMoney, formatNumber } from "@/lib/utils";
import { getSettings, getRate } from "./settings";
import { postTransaction } from "./wallet";
import { notify } from "./notifications";
import { DomainError } from "./errors";

const VERB: Record<TaskType, string> = {
  follow: "Follow",
  like: "Like the post",
  subscribe: "Subscribe to",
  comment: "Leave a genuine comment on",
  share: "Share the post",
  join_group: "Join the group",
  view: "Watch the video on",
  watch_time: "Watch the required number of minutes of",
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
 * What we could find out about a campaign's target before it launched: where
 * workers are sent, how their submissions will be settled, and what the
 * account was already sitting at.
 */
interface ResolvedTarget {
  /** Canonical link, so workers always land on the account being measured. */
  targetUrl: string;
  /** Count-checked platforms: the connected page and its starting count. */
  pageId?: string;
  /**
   * The target's own number the moment the campaign was created.
   *
   * Recorded whether or not the campaign can run hands-off. The count checker
   * needs it, but so does the person in the review queue: "the channel had
   * 12,400 subscribers at launch" is the only thing a screenshot can honestly
   * be weighed against, and on YouTube it arrives free with the lookup that
   * resolves the link anyway.
   */
  baselineFollowers?: number;
  /** Directly-checked platforms: the account we will ask about. */
  targetRef?: string;
  /** True when what we found is enough to settle the campaign without a person. */
  auto: boolean;
}

/**
 * Work out how a new campaign will be verified and what its target starts at.
 *
 * Never throws for a target it simply could not read: an unreadable one joins
 * the manual review queue rather than failing the buyer's launch, so a network
 * hiccup at the wrong moment costs a review, not a campaign.
 *
 * What can be read without the buyer connecting anything is decided by the
 * platform, not by us. YouTube publishes a channel's subscriber count to any
 * API key, so a YouTube campaign is measured from the link alone. Facebook and
 * Instagram serve a login wall to everything that is not their own app — there
 * is no public number to take — so those still need a connected page, and a
 * campaign without one keeps a blank baseline rather than a guessed one.
 */
async function resolveTarget(
  buyerId: string,
  input: CreateCampaignInput,
  autoVerify: boolean,
): Promise<ResolvedTarget> {
  // What a campaign falls back to: the buyer's own link, reviewed by a person.
  const manual: ResolvedTarget = { targetUrl: input.targetUrl.trim(), auto: false };

  // YouTube is the one platform that answers per worker, so it needs nothing
  // connected: resolve the channel out of the link the buyer pasted and the
  // subscription check does the rest. `follow` and `subscribe` are the same
  // act here, and the checker already settles both.
  if (input.platform === "youtube") {
    const direct = input.type === "subscribe" || input.type === "follow";
    try {
      const channel = await resolveChannelId(input.targetUrl);
      if (!channel) return manual;
      const auto = autoVerify && direct;
      return {
        // Only a campaign we are actually measuring gets its link rewritten to
        // the channel: a like or a comment campaign points at a *video*, and
        // sending those workers to the channel page instead would be wrong.
        targetUrl: auto ? channelUrl(channel) : manual.targetUrl,
        baselineFollowers: channel.subscribers,
        // Set only when it will be used. `createSubmission` refuses a worker
        // with no linked YouTube account on any campaign that carries one, and
        // a manually reviewed campaign has no business demanding that.
        ...(auto ? { targetRef: channel.channelId } : {}),
        auto,
      };
    } catch (e) {
      console.error("[youtube] channel lookup failed:", (e as Error).message);
      return manual;
    }
  }

  // Facebook and Instagram can only be counted, and a count needs an account
  // we hold a token for.
  if (!autoVerify) return manual;
  if (!input.pageId || input.type !== "follow") return manual;
  if (input.platform !== "facebook" && input.platform !== "instagram") return manual;

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
        auto: true,
      };
    } catch (e) {
      console.error("[instagram] baseline read failed:", (e as Error).message);
      return manual;
    }
  }

  try {
    const baseline = await getFollowerCount(page.pageId, page.accessToken);
    await prisma.facebookPage.update({
      where: { id: page.id },
      data: { followers: baseline, lastCheckedAt: new Date(), lastError: null },
    });
    return {
      targetUrl: pageUrl(page),
      pageId: page.id,
      baselineFollowers: baseline,
      auto: true,
    };
  } catch (e) {
    console.error("[facebook] baseline read failed:", (e as Error).message);
    return manual;
  }
}

export async function createCampaign(
  buyer: { id: string; name: string },
  input: CreateCampaignInput,
) {
  const settings = await getSettings();
  const quantity = Math.max(LIMITS.minCampaignQty, Math.floor(input.quantity));
  if (quantity > LIMITS.maxCampaignQty) throw new DomainError("Quantity too large");

  const target = await resolveTarget(buyer.id, input, settings.autoVerify);

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
        targetUrl: target.targetUrl,
        pageId: target.pageId ?? null,
        // Kept even for a campaign going to review — that is who needs it most.
        baselineFollowers: target.baselineFollowers ?? null,
        targetRef: target.targetRef ?? null,
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

  // Campaigns are never reviewed by hand: admins only handle deposits and
  // withdrawals. Every funded campaign goes live at once; `target.auto` only
  // decides whether its submissions are settled by the platform checker.
  return reviewCampaign(campaign.id, "active");
}

/**
 * Campaign state transitions. `target` is the desired CampaignStatus.
 *
 * `allowedFrom` limits which statuses the move may start from. It is checked
 * here, inside the transaction, rather than by the caller: a check made before
 * the transaction could pass on a status an admin changes a moment later.
 */
export async function reviewCampaign(
  id: string,
  target: CampaignStatus,
  opts: { allowedFrom?: CampaignStatus[]; ownerId?: string } = {},
) {
  const campaign = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({ where: { id } });
    if (!campaign) throw new DomainError("Campaign not found", 404);
    if (opts.ownerId && campaign.buyerId !== opts.ownerId) {
      throw new DomainError("Forbidden", 403);
    }

    const from = campaign.status;
    if (opts.allowedFrom && !opts.allowedFrom.includes(from)) {
      throw new DomainError(`A ${from.replace("_", " ")} campaign cannot be ${target}`, 409);
    }
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

  const said = {
    active: {
      kind: "success" as const,
      title: "Campaign is live",
      body: `"${campaign.title}" is now in front of workers.`,
    },
    rejected: {
      kind: "danger" as const,
      title: "Campaign rejected",
      body: `"${campaign.title}" was turned down — ${formatMoney(
        campaign.totalCost.toNumber(),
      )} refunded to your wallet.`,
    },
    completed: {
      kind: "success" as const,
      title: "Campaign completed",
      body: `"${campaign.title}" delivered all ${formatNumber(campaign.quantity)}.`,
    },
    cancelled: {
      kind: "info" as const,
      title: "Campaign cancelled",
      body: `"${campaign.title}" was stopped and the undelivered part refunded.`,
    },
    paused: null,
    draft: null,
    pending_review: null,
  }[campaign.status];

  if (said) {
    await notify({
      userId: campaign.buyerId,
      ...said,
      href: `/buyer/campaigns/${campaign.id}`,
      invalidate: ["Campaign", "Wallet", "Task"],
    });
  }
  return campaign;
}
