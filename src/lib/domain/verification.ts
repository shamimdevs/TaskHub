import "server-only";
import type { FacebookPage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFollowerCount, FacebookError } from "@/lib/facebook";
import { getSettings } from "./settings";
import { reviewSubmission } from "./submissions";

/**
 * Hands-off verification for Facebook follow campaigns.
 *
 * Facebook has no API for *who* followed a page, so this settles submissions
 * against the one number it does give: the page's follower count. A campaign
 * records the count it launched from; every poll re-reads the count and the
 * delta says how many follows are actually there to pay for.
 *
 *   room = (count - baseline) - (already cleared for this campaign)
 *
 * Oldest pending submission first: while there is room, clear it; when there
 * is none and the submission has waited out the grace window, reject it. If
 * the count falls below what has already been cleared, someone unfollowed —
 * the newest still-held rewards are reversed, newest first.
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
  errors: string[];
}

/** Reads the live follower count and records it against the page. */
async function pollPage(page: FacebookPage): Promise<number | null> {
  try {
    const followers = await getFollowerCount(page.pageId, page.accessToken);
    await prisma.$transaction([
      prisma.facebookPage.update({
        where: { id: page.id },
        data: { followers, lastCheckedAt: new Date(), lastError: null },
      }),
      prisma.pageFollowerSample.create({
        data: { pageId: page.id, followers },
      }),
    ]);
    return followers;
  } catch (e) {
    const message = e instanceof FacebookError ? e.message : "Follower count unavailable";
    await prisma.facebookPage.update({
      where: { id: page.id },
      data: { lastCheckedAt: new Date(), lastError: message },
    });
    return null;
  }
}

interface CampaignOutcome {
  approved: number;
  rejected: number;
  reversed: number;
}

/** Settles one campaign against a freshly read follower count. */
export async function settleCampaign(
  campaignId: string,
  followers: number,
  graceMins: number,
): Promise<CampaignOutcome> {
  const out: CampaignOutcome = { approved: 0, rejected: 0, reversed: 0 };

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
        "We could not see this follow on the page.",
      );
      out.rejected++;
    }
  }

  // Nothing left to deliver.
  const settled = await prisma.submission.count({
    where: { campaignId, status: { in: ["on_hold", "approved"] } },
  });
  if (settled >= campaign.quantity && campaign.status === "active") {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "completed" },
    });
  }

  return out;
}

/**
 * One pass over every connected page that has a live auto-verified campaign.
 * Safe to run on a short interval; it recomputes from database state, so a
 * repeat run is a no-op.
 */
export async function runFacebookVerification(): Promise<VerificationRun> {
  const run: VerificationRun = {
    pagesChecked: 0,
    campaigns: 0,
    approved: 0,
    rejected: 0,
    reversed: 0,
    errors: [],
  };

  const settings = await getSettings();
  if (!settings.autoVerify) return run;

  const pages = await prisma.facebookPage.findMany({
    where: {
      campaigns: {
        some: { status: "active", platform: "facebook", type: "follow" },
      },
    },
  });

  for (const page of pages) {
    const followers = await pollPage(page);
    run.pagesChecked++;
    if (followers === null) {
      run.errors.push(`${page.name}: follower count unavailable`);
      continue;
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        pageId: page.id,
        status: "active",
        platform: "facebook",
        type: "follow",
      },
      select: { id: true },
    });

    for (const c of campaigns) {
      const outcome = await settleCampaign(c.id, followers, settings.autoVerifyGraceMins);
      run.campaigns++;
      run.approved += outcome.approved;
      run.rejected += outcome.rejected;
      run.reversed += outcome.reversed;
    }
  }

  return run;
}
