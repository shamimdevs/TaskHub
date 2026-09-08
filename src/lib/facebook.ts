import "server-only";

/**
 * Thin Facebook Graph client.
 *
 * Scope note: Facebook exposes no endpoint that lists *who* follows a page —
 * `user_likes` was removed in Graph API v3.0 — so the only verification signal
 * available is the page's own follower count, read with a page access token.
 * Everything here exists to get that number reliably.
 */

const VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v21.0";
const GRAPH = `https://graph.facebook.com/${VERSION}`;

export const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID ?? "";
const APP_SECRET = process.env.FACEBOOK_APP_SECRET ?? "";

/**
 * Two flows share one app and one redirect URI:
 *  - "page"    a buyer connects a page we can read the follower count of;
 *  - "profile" a worker links their own account so proofs are tied to it.
 */
export type FacebookMode = "page" | "profile";

const SCOPES: Record<FacebookMode, string[]> = {
  // instagram_basic is what turns a connected page into an Instagram target:
  // it is the only route to the follower count of the business account behind
  // the page, and Instagram offers nothing else to verify a follow against.
  page: [
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_manage_insights",
  ],
  // user_link returns a usable profile URL; without App Review it is granted
  // only to app admins, so the profile link may come back empty.
  profile: ["public_profile"],
};

export const facebookConfigured = Boolean(FACEBOOK_APP_ID && APP_SECRET);

export class FacebookError extends Error {
  constructor(
    message: string,
    readonly status = 502,
    readonly code?: number,
  ) {
    super(message);
    this.name = "FacebookError";
  }
}

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { cache: "no-store" });
  const body = (await res.json().catch(() => null)) as
    | (T & { error?: { message: string; code?: number; type?: string } })
    | null;

  if (!res.ok || !body || body.error) {
    const err = body?.error;
    throw new FacebookError(
      err?.message ?? `Graph request failed (${res.status})`,
      res.status,
      err?.code,
    );
  }
  return body;
}

/** Where Facebook sends the user back after the login dialog. */
export function facebookRedirectUri(): string {
  const base =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/integrations/facebook/callback`;
}

/** The dialog URL. `state` carries the mode and our CSRF token. */
export function facebookLoginUrl(state: string, mode: FacebookMode): string {
  const url = new URL(`https://www.facebook.com/${VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", FACEBOOK_APP_ID);
  url.searchParams.set("redirect_uri", facebookRedirectUri());
  url.searchParams.set("state", state);
  url.searchParams.set("scope", SCOPES[mode].join(","));
  url.searchParams.set("response_type", "code");
  return url.toString();
}

/** Authorisation code -> short-lived user token. */
export async function exchangeCode(code: string): Promise<string> {
  const data = await graph<{ access_token: string }>("/oauth/access_token", {
    client_id: FACEBOOK_APP_ID,
    client_secret: APP_SECRET,
    redirect_uri: facebookRedirectUri(),
    code,
  });
  return data.access_token;
}

/** Short-lived user token -> ~60-day token, so page tokens do not expire. */
export async function longLivedUserToken(token: string): Promise<string> {
  const data = await graph<{ access_token: string }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: FACEBOOK_APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: token,
  });
  return data.access_token;
}

export interface ManagedPage {
  pageId: string;
  name: string;
  username?: string;
  accessToken: string;
  followers: number;
  instagram?: InstagramBusinessAccount;
}

export interface InstagramBusinessAccount {
  id: string;
  username?: string;
  followers: number;
}

/** Pages the signed-in person administers, each with its own page token. */
export async function listManagedPages(userToken: string): Promise<ManagedPage[]> {
  const data = await graph<{
    data: {
      id: string;
      name: string;
      username?: string;
      access_token: string;
      followers_count?: number;
      fan_count?: number;
      instagram_business_account?: {
        id: string;
        username?: string;
        followers_count?: number;
      };
    }[];
  }>("/me/accounts", {
    access_token: userToken,
    fields:
      "id,name,username,access_token,followers_count,fan_count," +
      "instagram_business_account{id,username,followers_count}",
    limit: "100",
  });

  return (data.data ?? []).map((p) => ({
    pageId: p.id,
    name: p.name,
    username: p.username,
    accessToken: p.access_token,
    followers: p.followers_count ?? p.fan_count ?? 0,
    instagram: p.instagram_business_account
      ? {
          id: p.instagram_business_account.id,
          username: p.instagram_business_account.username,
          followers: p.instagram_business_account.followers_count ?? 0,
        }
      : undefined,
  }));
}

/**
 * Follower count for the Instagram business account behind a page.
 *
 * This is the whole Instagram verification story. There is no endpoint, on any
 * token, that says whether one person follows another — so an Instagram
 * campaign is settled against this number moving, exactly the way a page's is.
 */
export async function getInstagramFollowerCount(
  instagramId: string,
  pageToken: string,
): Promise<number> {
  const data = await graph<{ followers_count?: number }>(`/${instagramId}`, {
    access_token: pageToken,
    fields: "followers_count",
  });
  if (typeof data.followers_count !== "number") {
    throw new FacebookError("Instagram account did not report a follower count");
  }
  return data.followers_count;
}

/** The public URL workers are sent to for an Instagram target. */
export function instagramUrl(username: string): string {
  return `https://www.instagram.com/${username}`;
}

/**
 * Current follower count for one page. `followers_count` is the modern field;
 * older pages only report `fan_count` (likes), so fall back to it.
 */
export async function getFollowerCount(
  pageId: string,
  pageToken: string,
): Promise<number> {
  const data = await graph<{ followers_count?: number; fan_count?: number }>(
    `/${pageId}`,
    { access_token: pageToken, fields: "followers_count,fan_count" },
  );
  const count = data.followers_count ?? data.fan_count;
  if (typeof count !== "number") {
    throw new FacebookError("Page did not report a follower count");
  }
  return count;
}

/** The public URL workers are sent to. */
export function pageUrl(page: { pageId: string; username?: string | null }): string {
  return page.username
    ? `https://www.facebook.com/${page.username}`
    : `https://www.facebook.com/${page.pageId}`;
}

export interface FacebookProfile {
  providerId: string;
  name: string;
  /** Only present when `user_link` was granted. */
  profileUrl?: string;
}

/** The signed-in person's own account — used to tie a worker's proofs to it. */
export async function getProfile(userToken: string): Promise<FacebookProfile> {
  const data = await graph<{ id: string; name: string; link?: string }>("/me", {
    access_token: userToken,
    fields: "id,name,link",
  });
  return { providerId: data.id, name: data.name, profileUrl: data.link };
}
