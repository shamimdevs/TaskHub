import "server-only";

/**
 * Instagram client — Instagram API with Instagram Login.
 *
 * Read this before extending it, because Instagram is the weakest of the three
 * and the code should not pretend otherwise:
 *
 *  - There is no endpoint, for any token, that says whether person A follows
 *    account B. The Basic Display API that used to expose a personal profile
 *    was shut down in December 2024, and nothing replaced it.
 *  - `instagram_business_basic` only authorises Business and Creator accounts,
 *    so a worker on a personal account cannot complete this flow at all. That
 *    is why `linkMethod: "claimed"` exists: they type their handle instead, and
 *    the one-handle-one-worker rule is the only thing standing behind it.
 *
 * So linking here buys identity, not proof. The follow itself is settled the
 * way Facebook's is — against the follower count of the buyer's own Instagram
 * business account, read through the Facebook page it is attached to (see
 * `getPageInstagramAccount` in src/lib/facebook.ts).
 */

const AUTHORIZE = "https://www.instagram.com/oauth/authorize";
const TOKEN = "https://api.instagram.com/oauth/access_token";
const GRAPH = "https://graph.instagram.com";

const APP_ID = process.env.INSTAGRAM_APP_ID ?? "";
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET ?? "";

const SCOPES = ["instagram_business_basic"];

export const instagramConfigured = Boolean(APP_ID && APP_SECRET);

export class InstagramError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "InstagramError";
  }
}

export function instagramRedirectUri(): string {
  const base =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/integrations/instagram/callback`;
}

export function instagramLoginUrl(state: string): string {
  const url = new URL(AUTHORIZE);
  url.searchParams.set("client_id", APP_ID);
  url.searchParams.set("redirect_uri", instagramRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * Authorisation code -> short-lived token. Note this one is a form POST, not
 * the GET the rest of Meta's OAuth uses.
 */
export async function exchangeCode(
  code: string,
): Promise<{ accessToken: string; userId: string }> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: APP_ID,
      client_secret: APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: instagramRedirectUri(),
      // Instagram rejects the code with the trailing "#_" the browser appends.
      code: code.replace(/#_$/, ""),
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    user_id?: number | string;
    error_message?: string;
    error_type?: string;
  } | null;

  if (!res.ok || !data?.access_token) {
    throw new InstagramError(
      data?.error_message ?? `Token exchange failed (${res.status})`,
      res.status,
    );
  }
  return { accessToken: data.access_token, userId: String(data.user_id ?? "") };
}

export interface InstagramProfile {
  providerId: string;
  username: string;
  accountType?: string;
}

/** The signed-in person's own account. */
export async function getProfile(accessToken: string): Promise<InstagramProfile> {
  const url = new URL(`${GRAPH}/me`);
  url.searchParams.set("fields", "id,username,account_type");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json().catch(() => null)) as {
    id?: string;
    username?: string;
    account_type?: string;
    error?: { message?: string };
  } | null;

  if (!res.ok || !data?.id || !data.username) {
    throw new InstagramError(
      data?.error?.message ?? `Profile read failed (${res.status})`,
      res.status,
    );
  }
  return {
    providerId: data.id,
    username: data.username,
    accountType: data.account_type,
  };
}

/** Public profile link for a handle. */
export function instagramProfileUrl(username: string): string {
  return `https://www.instagram.com/${username.replace(/^@/, "")}`;
}
