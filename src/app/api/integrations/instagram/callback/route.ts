import { requireApiUser, isResponse } from "@/lib/api";
import { finishOAuth, readState } from "@/lib/oauth-state";
import { exchangeCode, getProfile, instagramProfileUrl } from "@/lib/instagram";
import { AccountTakenError, linkAccount } from "@/lib/domain/social";

const RETURN = "/worker/accounts";

/**
 * Instagram sends the worker back here. All this buys is identity — a
 * confirmed handle nobody else can also claim. Whether the follow happened is
 * still settled against the buyer's follower count, because Instagram exposes
 * no way to ask.
 */
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = readState(req, "instagram");

  const back = (params: Record<string, string>) =>
    finishOAuth(req, "instagram", RETURN, params);

  if (url.searchParams.get("error")) return back({ ig: "cancelled" });
  if (!code || !state || !expected || state !== expected) {
    return back({ ig: "invalid_state" });
  }

  try {
    const { accessToken } = await exchangeCode(code);
    const profile = await getProfile(accessToken);

    await linkAccount({
      userId: auth.id,
      provider: "instagram",
      providerId: profile.providerId,
      name: `@${profile.username}`,
      username: profile.username,
      profileUrl: instagramProfileUrl(profile.username),
      linkMethod: "oauth",
      // Nothing to re-check later, so the token is not worth keeping.
    });

    return back({ ig: "linked" });
  } catch (e) {
    if (e instanceof AccountTakenError) return back({ ig: "taken" });
    console.error("[instagram] callback failed:", (e as Error).message);
    return back({ ig: "failed" });
  }
}
