import { requireApiUser, isResponse, apiError } from "@/lib/api";
import { newState, startOAuth } from "@/lib/oauth-state";
import { instagramConfigured, instagramLoginUrl } from "@/lib/instagram";

/**
 * Starts the Instagram link. Only Business and Creator accounts can complete
 * it — Instagram authorises nothing else since Basic Display was retired — so
 * the panel also offers the claim-your-handle path for everyone on a personal
 * account.
 */
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;
  if (!instagramConfigured) {
    return apiError(503, "Instagram linking is not configured on this server");
  }

  const state = newState();
  return startOAuth("instagram", instagramLoginUrl(state), state);
}
