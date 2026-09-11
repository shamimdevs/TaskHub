import "server-only";
import type { FacebookPage, Platform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getFollowerCount,
  getInstagramFollowerCount,
  FacebookError,
} from "@/lib/facebook";
import { isSubscribedTo, YouTubeError } from "@/lib/youtube";
import { getSettings } from "./settings";
import { reviewSubmission } from "./submissions";
import { youtubeAccessToken, noteAccountError } from "./social";
import { DomainError } from "./errors";

/**
 * Hands-off verification.
 *
 * There are only two honest ways to know whether a worker did what they were
 * paid for, and which one applies is decided by the platform, not by us:
 *
 *  DIRECT (YouTube) — ask the platform, as the worker, whether they subscribe
 *  to that channel. One call, one answer, per submission. It is exact: it does
 *  not care about timing, about other people's follows, or about how many
 *  submissions are in flight. Where this is available it is the only thing
 *  worth doing.
 *
 *  COUNT (Facebook, Instagram) — neither platform will say *who* follows an
 *  account, at any price, so all that is left is the account's own follower
 *  count. A campaign records the count it launched from, and the delta says
 *  how many follows are actually there to pay for:
 *
 *      room = (count - baseline) - (already cleared for this campaign)
 *
 *  Oldest pending submission first: while there is room, clear it; when there
 *  is none and the submission has waited out the grace window, reject it. If
 *  the count falls below what has already been cleared, someone unfollowed —
 *  the newest still-held rewards are reversed, newest first.
 *
 * Only rewards still inside their hold window are reversible. Once the hold
 * elapses and the money is released, the delivery is final.
 */

export interface VerificationRun {
  pagesChecked: number;
  campaigns: number;
  approved: number;
  rejected: number;
  reversed: number;
  /** Submissions left for a person because we could not get an answer. */
  deferred: number;
  errors: string[];
}

function emptyRun(): VerificationRun {
  return {
    pagesChecked: 0,
    campaigns: 0,
    approved: 0,
    rejected: 0,
    reversed: 0,
    deferred: 0,
    errors: [],
  };
}

interface Outcome {
  approved: number;
  rejected: number;
  reversed: number;
  deferred: number;
}

const noOutcome = (): Outcome => ({
  approved: 0,
  rejected: 0,
  reversed: 0,
  deferred: 0,
});

function absorb(run: VerificationRun, o: Outcome) {
  run.approved += o.approved;
  run.rejected += o.rejected;
  run.reversed += o.reversed;
  run.deferred += o.deferred;
}

/**
 * Settle one submission, or report that somebody else already did.
 *
 * The on-submit check, a second server instance and an admin can all reach the
 * same submission; `reviewSubmission` refuses whichever arrives second with a
 * DomainError. That is not a failure of the pass — it must not abort the
 * campaigns still waiting behind this one.
 */
async function settle(
  id: string,
  action: "approve" | "reject",
  note: string,
): Promise<boolean> {
  try {
    await reviewSubmission(null, id, action, note);
    return true;
  } catch (e) {
    if (e instanceof DomainError) return false;
    throw e;
  }
}

/* ------------------------------------------------------------------ *
 * Direct checks — YouTube
 * ------------------------------------------------------------------ */

/**
 * How often a reward still on hold is asked about again. Every question costs
 * YouTube quota, and a subscription that was there an hour ago almost always
 * still is; re-asking on every pass spent the day's quota on a few dozen held
 * rewards. A few times a day still catches the unsubscribe well inside any
 * hold window.
 */
const RECHECK_HELD_MS = 6 * 3_600_000;

const APPROVED_NOTE = "Confirmed on your YouTube subscriptions.";

interface DirectSubmission {
  id: string;
  workerId: string;
  /** The channel id it was submitted with; null on older submissions. */
  accountRef: string | null;
}

/**
 * Asks YouTube, as each worker, whether they subscribe to `channelId`.
 *
 * Every worker's account is read once, and every token refreshed at most once,
 * however many submissions of theirs are in play.
 *
 * A worker with no linked account, a revoked one, or a different channel from
 * the one they submitted with gets null rather than false: the automation
 * could not see an answer, which is not the same as seeing that they did not
 * subscribe, and only the second deserves a refusal.
 */
async function youtubeChecker(channelId: string, workerIds: string[]) {
  const accounts = await prisma.socialAccount.findMany({
    where: { provider: "youtube", userId: { in: workerIds } },
  });
  const byWorker = new Map(accounts.map((a) => [a.userId, a]));

  const tokens = new Map<string, string | null>();
  const checked = new Set<string>();

  return async (sub: DirectSubmission): Promise<boolean | null> => {
    const account = byWorker.get(sub.workerId);
    if (!account) return null;
    // The channel that submitted is the one that has to be subscribed. A
    // worker who has since switched channels is asked nothing — the new
    // channel's subscriptions say nothing about the old one's.
    if (sub.accountRef && sub.accountRef !== account.providerId) return null;

    if (!tokens.has(account.id)) {
      tokens.set(account.id, await youtubeAccessToken(account));
    }
    const token = tokens.get(account.id);
    if (!token) return null;

    try {
      const result = await isSubscribedTo(token, channelId);
      // One clean read is enough to clear the account's error for this pass.
      if (!checked.has(account.id)) {
        checked.add(account.id);
        await prisma.socialAccount.update({
          where: { id: account.id },
          data: { lastCheckedAt: new Date(), lastError: null },
        });
      }
      return result;
    } catch (e) {
      const message = e instanceof YouTubeError ? e.message : "YouTube check failed";
      await noteAccountError(account.id, message);
      // Stop hammering a token that just failed.
      tokens.set(account.id, null);
      return null;
    }
  };
}

/**
 * Settles one campaign by asking YouTube about each worker in turn — both the
 * submissions waiting to be cleared and the ones on hold that are due a
 * re-check, in one go.
 *
 * Deferred submissions (no answer) stay pending and are asked again next pass.
 */
async function settleDirectCampaign(
  campaignId: string,
  channelId: string,
  graceMins: number,
): Promise<Outcome> {
  const out = noOutcome();
  const now = Date.now();
  const recheckBefore = new Date(now - RECHECK_HELD_MS);

  const [pending, held] = await Promise.all([
    prisma.submission.findMany({
      where: { campaignId, status: "pending" },
      orderBy: { submittedAt: "asc" },
      select: { id: true, workerId: true, accountRef: true, submittedAt: true },
      take: 500,
    }),
    prisma.submission.findMany({
      where: {
        campaignId,
        status: "approved",
        releasedAt: null,
        OR: [
          { lastCheckedAt: { lt: recheckBefore } },
          // Approved before `lastCheckedAt` existed.
          { lastCheckedAt: null, reviewedAt: { lt: recheckBefore } },
          { lastCheckedAt: null, reviewedAt: null },
        ],
      },
      orderBy: { submittedAt: "desc" },
      select: { id: true, workerId: true, accountRef: true },
      take: 500,
    }),
  ]);
  if (!pending.length && !held.length) return out;

  const subscribes = await youtubeChecker(channelId, [
    ...new Set([...pending, ...held].map((s) => s.workerId)),
  ]);

  const graceMs = graceMins * 60_000;

  for (const sub of pending) {
    const answer = await subscribes(sub);
    if (answer === null) {
      out.deferred++;
      continue;
    }
    if (answer) {
      if (await settle(sub.id, "approve", APPROVED_NOTE)) out.approved++;
      continue;
    }
    // Not subscribed. Give them the grace window before refusing — the check
    // can run seconds after they submit, and YouTube is not always instant.
    if (now - sub.submittedAt.getTime() >= graceMs) {
      if (
        await settle(
          sub.id,
          "reject",
          "Your YouTube account is not subscribed to this channel.",
        )
      ) {
        out.rejected++;
      }
    }
  }

  // Anyone who unsubscribed while their reward was still on hold. The direct
  // check makes this exact: we know which worker it was, rather than inferring
  // it from a count that fell.
  for (const sub of held) {
    const answer = await subscribes(sub);
    // No answer means no accusation: leave the reward alone and ask again.
    if (answer === null) continue;
    if (answer) {
      await prisma.submission.update({
        where: { id: sub.id },
        data: { lastCheckedAt: new Date() },
      });
      continue;
    }
    if (
      await settle(
        sub.id,
        "reject",
        "The subscription was undone before the hold period ended.",
      )
    ) {
      out.reversed++;
    }
  }

  return out;
}

/**
 * Check one YouTube submission the moment it is made, so a worker who really
 * subscribed is paid while still on the page instead of on the next cron pass.
 *
 * Only ever approves. A "not subscribed" here is usually YouTube a few seconds
 * behind the click, so refusing is left to the cron after the grace window.
 * Returns true when the submission was approved.
 */
export async function checkSubmissionNow(submissionId: string): Promise<boolean> {
  const settings = await getSettings();
  if (!settings.autoVerify) return false;

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      workerId: true,
      accountRef: true,
      status: true,
      campaign: {
        select: {
          id: true,
          platform: true,
          targetRef: true,
          quantity: true,
          status: true,
        },
      },
    },
  });
  if (!sub || sub.status !== "pending") return false;
  const { campaign } = sub;
  if (campaign.platform !== "youtube" || !campaign.targetRef) return false;

  const subscribes = await youtubeChecker(campaign.targetRef, [sub.workerId]);
  if ((await subscribes(sub)) !== true) return false;
  if (!(await settle(sub.id, "approve", APPROVED_NOTE))) return false;

  await completeIfDelivered(campaign.id, campaign.quantity, campaign.status);
  return true;
}

/* ------------------------------------------------------------------ *
 * Count checks — Facebook, Instagram
 * ------------------------------------------------------------------ */

/** Reads a live follower count for one platform and records it. */
async function pollPage(
  page: FacebookPage,
  platform: Platform,
): Promise<number | null> {
  try {
    const followers =
      platform === "instagram"
        ? await getInstagramFollowerCount(page.instagramId!, page.accessToken)
        : await getFollowerCount(page.pageId, page.accessToken);

    await prisma.$transaction([
      prisma.facebookPage.update({
        where: { id: page.id },
        data:
          platform === "instagram"
            ? { instagramFollowers: followers, lastCheckedAt: new Date(), lastError: null }
            : { followers, lastCheckedAt: new Date(), lastError: null },
      }),
      prisma.pageFollowerSample.create({
        data: { pageId: page.id, platform, followers },
      }),
    ]);
    return followers;
  } catch (e) {
    const message =
      e instanceof FacebookError ? e.message : "Follower count unavailable";
    await prisma.facebookPage.update({
      where: { id: page.id },
      data: { lastCheckedAt: new Date(), lastError: message },
    });
    return null;
  }
}

/** Settles one campaign against a freshly read follower count. */
export async function settleCampaign(
  campaignId: string,
  followers: number,
  graceMins: number,
): Promise<Outcome> {
  const out = noOutcome();

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.baselineFollowers === null) return out;

  const delta = followers - campaign.baselineFollowers;

  const [pending, held, releasedCount] = await Promise.all([
    prisma.submission.findMany({
      where: { campaignId, status: "pending" },
      orderBy: { submittedAt: "asc" },
      select: { id: true, submittedAt: true },
    }),
    prisma.submission.findMany({
      where: { campaignId, status: "approved", releasedAt: null },
      orderBy: { submittedAt: "desc" },
      select: { id: true },
    }),
    prisma.submission.count({
      where: { campaignId, status: "approved", releasedAt: { not: null } },
    }),
  ]);

  let cleared = held.length + releasedCount;

  // More cleared than the count supports: follows were undone.
  let shortfall = cleared - delta;
  for (const sub of held) {
    if (shortfall <= 0) break;
    if (
      await settle(sub.id, "reject", "The follow was undone before the hold period ended.")
    ) {
      out.reversed++;
    }
    cleared--;
    shortfall--;
  }

  // Room left over pays for the submissions that are waiting.
  let room = delta - cleared;
  const graceMs = graceMins * 60_000;
  const now = Date.now();

  for (const sub of pending) {
    if (room > 0) {
      if (await settle(sub.id, "approve", "Confirmed by follower count.")) {
        out.approved++;
      }
      room--;
      continue;
    }
    if (now - sub.submittedAt.getTime() >= graceMs) {
      if (await settle(sub.id, "reject", "We could not see this follow on the account.")) {
        out.rejected++;
      }
    }
  }

  await completeIfDelivered(campaignId, campaign.quantity, campaign.status);
  return out;
}

/** Nothing left to deliver. */
async function completeIfDelivered(
  campaignId: string,
  quantity: number,
  status: string,
) {
  if (status !== "active") return;
  const settled = await prisma.submission.count({
    where: { campaignId, status: "approved" },
  });
  if (settled >= quantity) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "completed" },
    });
  }
}

/**
 * A completed campaign that just had a held reward reversed is short again:
 * the reversal put the slot back on the task, so put the campaign back in
 * front of workers to fill it — the buyer paid for that delivery.
 */
async function reopenIfShort(campaignId: string, quantity: number) {
  const settled = await prisma.submission.count({
    where: { campaignId, status: "approved" },
  });
  if (settled < quantity) {
    await prisma.campaign.updateMany({
      where: { id: campaignId, status: "completed" },
      data: { status: "active" },
    });
  }
}

/* ------------------------------------------------------------------ *
 * The pass
 * ------------------------------------------------------------------ */

/** Every live campaign whose follows are settled against a follower count. */
async function runCountVerification(
  graceMins: number,
  run: VerificationRun,
): Promise<void> {
  const pages = await prisma.facebookPage.findMany({
    where: {
      campaigns: {
        some: {
          status: "active",
          platform: { in: ["facebook", "instagram"] },
          type: "follow",
        },
      },
    },
  });

  for (const page of pages) {
    // One page can back both a Facebook and an Instagram campaign; each is
    // settled against its own count, so each needs its own read.
    for (const platform of ["facebook", "instagram"] as const) {
      if (platform === "instagram" && !page.instagramId) continue;

      try {
        const campaigns = await prisma.campaign.findMany({
          where: { pageId: page.id, status: "active", platform, type: "follow" },
          select: { id: true },
        });
        if (!campaigns.length) continue;

        const followers = await pollPage(page, platform);
        run.pagesChecked++;
        if (followers === null) {
          run.errors.push(`${page.name} (${platform}): follower count unavailable`);
          continue;
        }

        for (const c of campaigns) {
          absorb(run, await settleCampaign(c.id, followers, graceMins));
          run.campaigns++;
        }
      } catch (e) {
        // One page's failure must not strand every campaign behind it.
        console.error(`[verify] ${page.name} (${platform}) failed:`, e);
        run.errors.push(`${page.name} (${platform}): ${(e as Error).message}`);
      }
    }
  }
}

/** Every campaign we can ask the platform about worker by worker. */
async function runDirectVerification(
  graceMins: number,
  run: VerificationRun,
): Promise<void> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      // Not only active ones. Submissions taken before a pause still need an
      // answer, and a completed campaign's rewards are still on hold — an
      // unsubscribe there has to be caught just the same.
      status: { in: ["active", "paused", "completed"] },
      platform: "youtube",
      type: { in: ["subscribe", "follow"] },
      targetRef: { not: null },
    },
    select: { id: true, targetRef: true, quantity: true, status: true },
  });

  for (const c of campaigns) {
    try {
      const out = await settleDirectCampaign(c.id, c.targetRef!, graceMins);
      absorb(run, out);
      run.campaigns++;
      if (c.status === "active") {
        await completeIfDelivered(c.id, c.quantity, c.status);
      } else if (c.status === "completed" && out.reversed > 0) {
        await reopenIfShort(c.id, c.quantity);
      }
    } catch (e) {
      // One campaign's failure must not strand every campaign behind it.
      console.error(`[verify] campaign ${c.id} failed:`, e);
      run.errors.push(`campaign ${c.id}: ${(e as Error).message}`);
    }
  }
}

/**
 * One pass over every auto-verified campaign, direct checks and count checks
 * alike. Safe to run on a short interval: it recomputes from database state,
 * so a repeat run is a no-op.
 */
export async function runAutoVerification(): Promise<VerificationRun> {
  const run = emptyRun();

  const settings = await getSettings();
  if (!settings.autoVerify) return run;

  await runDirectVerification(settings.autoVerifyGraceMins, run);
  await runCountVerification(settings.autoVerifyGraceMins, run);

  return run;
}
