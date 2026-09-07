import { requireApiUser, isResponse, apiError } from "@/lib/api";
import { newState, startOAuth } from "@/lib/oauth-state";
import { youtubeConfigured, youtubeLoginUrl } from "@/lib/youtube";

/**
 * Starts the YouTube link. This is the strongest connection in the app: with
 * it, every subscribe task the worker takes is checked against their own
 * subscription list rather than against a follower count that moved.
 *
 * A top-level navigation, not a fetch — the browser follows the redirect and
 * the worker consents once.
 */
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;
  if (!youtubeConfigured) {
    return apiError(503, "YouTube linking is not configured on this server");
  }

  const state = newState();
  return startOAuth("youtube", youtubeLoginUrl(state), state);
}
