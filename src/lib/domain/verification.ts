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

/* ------------------------------------------------------------------ *
 * Direct checks — YouTube
 * ------------------------------------------------------------------ */

/**
 * How long a just-approved submission is left alone before we re-check whether
 * the subscription is still there. Without it, every submission cleared in a
 * pass would be checked twice in that same pass — a doubled YouTube quota bill
 * for an answer we already have.
 */
const RECHECK_AFTER_MS = 5 * 60_000;

/**
 * Settles one campaign by asking YouTube about each worker in turn — both the
 * submissions waiting to be cleared and the ones already on hold, in one go.
 *
 * Both halves share a single account read and a single token cache, so a
 * worker whose access token needs refreshing costs exactly one round trip to
 * Google however many submissions of theirs are in play.
 *
 * A worker with no linked account, or a revoked one, is *deferred* rather than
 * rejected: the automation could not see an answer, which is not the same as
 * seeing that they did not subscribe, and only the second deserves a refusal.
 * Deferred submissions stay pending for the admin queue.
 */
async function settleDirectCampaign(
  campaignId: string,
  channelId: string,
  graceMins: number,
): Promise<Outcome> {
  const out = noOutcome();
  const now = Date.now();

  const [pending, held] = await Promise.all([
    prisma.submission.findMany({
      where: { campaignId, status: "pending" },
      orderBy: { submittedAt: "asc" },
      select: { id: true, workerId: true, submittedAt: true },
      take: 500,
    }),
    prisma.submission.findMany({
      where: {
        campaignId,
        status: "on_hold",
        // Anything cleared moments ago was just confirmed; leave it be.
        OR: [
          { reviewedAt: null },
          { reviewedAt: { lt: new Date(now - RECHECK_AFTER_MS) } },
        ],
      },
      orderBy: { submittedAt: "desc" },
      select: { id: true, workerId: true },
      take: 500,
    }),
  ]);
  if (!pending.length && !held.length) return out;

  // Everyone's account in one read — a campaign's submissions come from many
  // different workers, and one query beats one round-trip each.
  const workerIds = [
    ...new Set([...pending, ...held].map((s) => s.workerId)),
  ];
  const accounts = await prisma.socialAccount.findMany({
    where: { provider: "youtube", userId: { in: workerIds } },
  });
  const byWorker = new Map(accounts.map((a) => [a.userId, a]));

  const tokens = new Map<string, string | null>();
  const checked = new Set<string>();

  /**
   * Whether this worker subscribes, or null when we could not find out. The
   * distinction is the whole point: null never costs anyone a reward.
   */
  const subscribes = async (workerId: string): Promise<boolean | null> => {
    const account = byWorker.get(workerId);
    if (!account) return null;

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

  const graceMs = graceMins * 60_000;

  for (const sub of pending) {
    const answer = await subscribes(sub.workerId);
    if (answer === null) {
      out.deferred++;
      continue;
    }
    if (answer) {
      await reviewSubmission(
        null,
        sub.id,
        "approve",
        "Confirmed on your YouTube subscriptions.",
      );
      out.approved++;
      continue;
    }
    // Not subscribed. Give them the grace window before refusing — the check
    // can run seconds after they submit, and YouTube is not always instant.
    if (now - sub.submittedAt.getTime() >= graceMs) {
      await reviewSubmission(
        null,
        sub.id,
        "reject",
        "Your YouTube account is not subscribed to this channel.",
      );
      out.rejected++;
    }
  }

  // Anyone who unsubscribed while their reward was still on hold. The direct
  // check makes this exact: we know which worker it was, rather than inferring
  // it from a count that fell.
  for (const sub of held) {
    // No answer means no accusation: leave the reward alone.
    if ((await subscribes(sub.workerId)) === false) {
      await reviewSubmission(
        null,
        sub.id,
        "reject",
        "The subscription was undone before the hold period ended.",
      );
      out.reversed++;
    }
  }

  return out;
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
      where: { campaignId, status: "on_hold" },
      orderBy: { submittedAt: "desc" },
      select: { id: true },
    }),
    prisma.submission.count({ where: { campaignId, status: "approved" } }),
  ]);

  let cleared = held.length + releasedCount;

  // More cleared than the count supports: follows were undone.
  let shortfall = cleared - delta;
  for (const sub of held) {
    if (shortfall <= 0) break;
    await reviewSubmission(
      null,
      sub.id,
      "reject",
      "The follow was undone before the hold period ended.",
    );
    out.reversed++;
    cleared--;
    shortfall--;
  }

  // Room left over pays for the submissions that are waiting.
  let room = delta - cleared;
  const graceMs = graceMins * 60_000;
  const now = Date.now();

  for (const sub of pending) {
    if (room > 0) {
      await reviewSubmission(null, sub.id, "approve", "Confirmed by follower count.");
      out.approved++;
      room--;
      continue;
    }
    if (now - sub.submittedAt.getTime() >= graceMs) {
      await reviewSubmission(
        null,
        sub.id,
        "reject",
        "We could not see this follow on the account.",
      );
      out.rejected++;
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
    where: { campaignId, status: { in: ["on_hold", "approved"] } },
  });
  if (settled >= quantity) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "completed" },
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
    }
  }
}

/** Every live campaign we can ask the platform about worker by worker. */
async function runDirectVerification(
  graceMins: number,
  run: VerificationRun,
): Promise<void> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "active",
      platform: "youtube",
      type: { in: ["subscribe", "follow"] },
      targetRef: { not: null },
    },
    select: { id: true, targetRef: true, quantity: true, status: true },
  });

  for (const c of campaigns) {
    absorb(run, await settleDirectCampaign(c.id, c.targetRef!, graceMins));
    run.campaigns++;
    await completeIfDelivered(c.id, c.quantity, c.status);
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
