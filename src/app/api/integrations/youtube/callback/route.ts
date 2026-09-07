import { requireApiUser, isResponse } from "@/lib/api";
import { finishOAuth, readState } from "@/lib/oauth-state";
import { exchangeCode, getMyChannel, channelUrl, YouTubeError } from "@/lib/youtube";
import { AccountTakenError, linkAccount } from "@/lib/domain/social";

const RETURN = "/worker/accounts";

/**
 * Google sends the worker back here. Trades the code for tokens, reads the
 * channel behind them, and binds it to the TaskHub account.
 *
 * The refresh token is the point of the whole exchange: without one, the
 * subscription checker can only work for the hour after linking.
 */
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = readState(req, "youtube");

  const back = (params: Record<string, string>) =>
    finishOAuth(req, "youtube", RETURN, params);

  if (url.searchParams.get("error")) return back({ yt: "cancelled" });
  if (!code || !state || !expected || state !== expected) {
    return back({ yt: "invalid_state" });
  }

  try {
    const tokens = await exchangeCode(code);
    const channel = await getMyChannel(tokens.accessToken);

    await linkAccount({
      userId: auth.id,
      provider: "youtube",
      providerId: channel.channelId,
      name: channel.title,
      username: channel.handle ?? null,
      profileUrl: channelUrl(channel),
      linkMethod: "oauth",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? null,
      tokenExpiresAt: tokens.expiresAt,
      scope: tokens.scope ?? null,
    });

    // Without a refresh token the link still identifies them, but the checker
    // goes quiet within the hour — worth saying so rather than claiming more.
    return back({ yt: tokens.refreshToken ? "linked" : "linked_no_refresh" });
  } catch (e) {
    if (e instanceof AccountTakenError) return back({ yt: "taken" });
    if (e instanceof YouTubeError && e.status === 404) return back({ yt: "no_channel" });
    console.error("[youtube] callback failed:", (e as Error).message);
    return back({ yt: "failed" });
  }
}
