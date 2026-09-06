import { apiError, json } from "@/lib/api";
import { runFacebookVerification } from "@/lib/domain/verification";
import { releaseDueRewards } from "@/lib/domain/submissions";

/**
 * The automation loop. Reads every connected page's follower count, clears or
 * refuses the submissions waiting on it, reverses follows that were undone,
 * then releases any reward whose hold has elapsed.
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

  const verification = await runFacebookVerification();
  const released = await releaseDueRewards();
  return json({ ...verification, released });
}
