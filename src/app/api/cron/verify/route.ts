import { apiError, json } from "@/lib/api";
import { runAutoVerification } from "@/lib/domain/verification";
import { releaseDueRewards } from "@/lib/domain/submissions";
import { runProfileCodeVerification } from "@/lib/domain/social";

/**
 * The automation loop. Asks YouTube, worker by worker, who actually
 * subscribed; reads every connected page's and Instagram account's follower
 * count for the platforms that will not answer that question; clears or
 * refuses the submissions waiting on each, reverses the follows that were
 * undone, then releases any reward whose hold has elapsed.
 *
 * Point a scheduler at this every few minutes:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" $URL/api/cron/verify
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return apiError(401, "Unauthorized");
  }

  // Settle account ownership first: a worker whose profile code has just
  // landed should be verified before this pass judges their submissions.
  const accounts = await runProfileCodeVerification();
  const verification = await runAutoVerification();
  const released = await releaseDueRewards();
  return json({ ...verification, accounts, released });
}
