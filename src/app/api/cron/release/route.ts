import { apiError, json } from "@/lib/api";
import { releaseDueRewards } from "@/lib/domain/submissions";

/**
 * Settles rewards whose hold window has elapsed. Wire an external scheduler
 * (cron, Vercel Cron, GitHub Action) to hit this every few minutes:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" $URL/api/cron/release
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return apiError(401, "Unauthorized");
  }
  const released = await releaseDueRewards();
  return json({ released });
}
