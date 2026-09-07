import "server-only";

/**
 * YouTube / Google client.
 *
 * YouTube is the one platform here that answers the question this product
 * turns on. `subscriptions.list?mine=true&forChannelId=<id>` runs as the
 * *worker* and says plainly whether that worker subscribes to that channel —
 * no follower-count arithmetic, no waiting for a number to move, and no
 * buyer-side connection at all. So a YouTube subscribe campaign is settled per
 * submission, and a rejection can name its reason honestly.
 *
 * The cost is a token per worker: `youtube.readonly`, offline, so the checker
 * still works long after they closed the browser.
 */

const OAUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/youtube/v3";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
/** Optional. Only ever used to resolve an @handle to a channel id. */
const API_KEY = process.env.YOUTUBE_API_KEY ?? "";

/** Read-only is all we need, and all we ask for. */
export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
];

export const youtubeConfigured = Boolean(CLIENT_ID && CLIENT_SECRET);

/**
 * An API key is enough to read a channel's public description, which is all
 * the profile-code check needs. It asks nothing of Google beyond a free key —
 * no OAuth secret, no consent screen, no app verification — so a worker can
 * prove they own a channel long before the full OAuth link is available.
 */
export const youtubeReadConfigured = Boolean(API_KEY);

export class YouTubeError extends Error {
  constructor(
    message: string,
    readonly status = 502,
    /** True when the worker's grant is gone: revoked, expired or withdrawn. */
    readonly authExpired = false,
  ) {
    super(message);
    this.name = "YouTubeError";
  }
}

export function youtubeRedirectUri(): string {
  const base =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/integrations/youtube/callback`;
}

/**
 * The consent screen. `access_type=offline` with `prompt=consent` is
 * deliberate: Google only returns a refresh token on a fresh consent, and
 * without one the checker stops working an hour after linking.
 */
export function youtubeLoginUrl(state: string): string {
  const url = new URL(OAUTH);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", youtubeRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

export interface YouTubeTokens {
  accessToken: string;
  refreshToken?: string;
  /** Absolute, not the seconds Google returns. */
  expiresAt: Date;
  scope?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<YouTubeTokens> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  } | null;

  if (!res.ok || !data?.access_token) {
    // invalid_grant is Google for "this refresh token is dead" — the worker
    // removed the app or changed their password. Not a transient failure.
    const expired = data?.error === "invalid_grant";
    throw new YouTubeError(
      data?.error_description ?? data?.error ?? `Token request failed (${res.status})`,
      res.status,
      expired,
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    scope: data.scope,
  };
}

export function exchangeCode(code: string): Promise<YouTubeTokens> {
  return tokenRequest({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: youtubeRedirectUri(),
    grant_type: "authorization_code",
    code,
  });
}

export function refreshAccessToken(refreshToken: string): Promise<YouTubeTokens> {
  return tokenRequest({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

/** One Data API call, as a worker (`token`) or as the app (the API key). */
async function api<T>(
  path: string,
  params: Record<string, string>,
  token?: string,
): Promise<T> {
  const url = new URL(`${API}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (!token) {
    if (!API_KEY) throw new YouTubeError("No YouTube credentials for this call", 503);
    url.searchParams.set("key", API_KEY);
  }

  const res = await fetch(url, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as
    | (T & { error?: { message: string; errors?: { reason?: string }[] } })
    | null;

  if (!res.ok || !body || body.error) {
    const reason = body?.error?.errors?.[0]?.reason;
    throw new YouTubeError(
      body?.error?.message ?? `YouTube request failed (${res.status})`,
      res.status,
      res.status === 401 || reason === "authError",
    );
  }
  return body;
}

export interface YouTubeChannel {
  channelId: string;
  title: string;
  /** The @handle, without the @. */
  handle?: string;
  /** The channel's public "about" text — where a profile code is looked for. */
  description?: string;
  thumbnailUrl?: string;
  subscribers?: number;
}

interface ChannelListResponse {
  items?: {
    id: string;
    snippet?: {
      title?: string;
      customUrl?: string;
      description?: string;
      thumbnails?: { default?: { url?: string } };
    };
    statistics?: { subscriberCount?: string };
  }[];
}

function toChannel(item: NonNullable<ChannelListResponse["items"]>[number]): YouTubeChannel {
  const subs = item.statistics?.subscriberCount;
  return {
    channelId: item.id,
    title: item.snippet?.title ?? "YouTube channel",
    handle: item.snippet?.customUrl?.replace(/^@/, ""),
    description: item.snippet?.description,
    thumbnailUrl: item.snippet?.thumbnails?.default?.url,
    subscribers: subs === undefined ? undefined : Number(subs),
  };
}

/** The signed-in worker's own channel — what their proofs are tied to. */
export async function getMyChannel(accessToken: string): Promise<YouTubeChannel> {
  const data = await api<ChannelListResponse>(
    "/channels",
    { part: "snippet,statistics", mine: "true", maxResults: "1" },
    accessToken,
  );
  const item = data.items?.[0];
  // A Google account that has never opened YouTube lands here: an identity,
  // but no channel to tie proofs to.
  if (!item) throw new YouTubeError("This Google account has no YouTube channel yet", 404);
  return toChannel(item);
}

/**
 * Does this worker subscribe to that channel?
 *
 * This is a filtered lookup, not a scan: `forChannelId` asks the API to return
 * only the matching subscription, so it stays one cheap call however many
 * thousands of channels the worker follows.
 *
 * A private subscription list is not an obstacle either — `mine=true` reads
 * the worker's own subscriptions with the worker's own token, so settings that
 * hide the list from the public do not hide it from this.
 */
export async function isSubscribedTo(
  accessToken: string,
  channelId: string,
): Promise<boolean> {
  const data = await api<{ items?: unknown[] }>(
    "/subscriptions",
    { part: "id", mine: "true", forChannelId: channelId, maxResults: "1" },
    accessToken,
  );
  return (data.items?.length ?? 0) > 0;
}

/**
 * Look a channel up by its @handle. Public data only, so an API key is enough
 * — this is what lets a worker prove a channel is theirs without the OAuth
 * credentials being configured at all.
 */
export async function getChannelByHandle(
  handle: string,
  accessToken?: string,
): Promise<YouTubeChannel | null> {
  const data = await api<ChannelListResponse>(
    "/channels",
    {
      part: "snippet,statistics",
      forHandle: handle.replace(/^@/, ""),
      maxResults: "1",
    },
    accessToken,
  );
  const item = data.items?.[0];
  return item ? toChannel(item) : null;
}

/** Public details for a channel id — used to name a campaign's target. */
export async function getChannel(
  channelId: string,
  accessToken?: string,
): Promise<YouTubeChannel | null> {
  const data = await api<ChannelListResponse>(
    "/channels",
    { part: "snippet,statistics", id: channelId, maxResults: "1" },
    accessToken,
  );
  const item = data.items?.[0];
  return item ? toChannel(item) : null;
}

/**
 * Pull a channel id out of whatever the buyer pasted.
 *
 * `/channel/UC…` is decided on the spot. An `@handle`, `/c/name` or
 * `/user/name` has to be resolved through the API, which needs a key or a
 * token; with neither this returns null and the campaign falls back to manual
 * review rather than failing the buyer's launch.
 */
export async function resolveChannelId(
  targetUrl: string,
  accessToken?: string,
): Promise<YouTubeChannel | null> {
  let url: URL;
  try {
    url = new URL(targetUrl.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)youtube\.com$/i.test(url.hostname)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const [first, second] = segments;

  // An explicit /channel/UC… link already *is* the answer. Look it up for the
  // title, but never let a missing API key turn a perfectly valid link into a
  // manual-review campaign.
  if (first === "channel" && second?.startsWith("UC")) {
    try {
      const found = await getChannel(second, accessToken);
      if (found) return found;
    } catch {
      // fall through to the id we already have
    }
    return { channelId: second, title: "YouTube channel" };
  }

  const handle = first?.startsWith("@")
    ? first.slice(1)
    : first === "c" && second
      ? second
      : undefined;

  if (handle) {
    const data = await api<ChannelListResponse>(
      "/channels",
      { part: "snippet,statistics", forHandle: handle, maxResults: "1" },
      accessToken,
    );
    const item = data.items?.[0];
    if (item) return toChannel(item);
  }

  if (first === "user" && second) {
    const data = await api<ChannelListResponse>(
      "/channels",
      { part: "snippet,statistics", forUsername: second, maxResults: "1" },
      accessToken,
    );
    const item = data.items?.[0];
    if (item) return toChannel(item);
  }

  return null;
}

/** The public URL workers are sent to. */
export function channelUrl(channel: {
  channelId: string;
  handle?: string | null;
}): string {
  return channel.handle
    ? `https://www.youtube.com/@${channel.handle}`
    : `https://www.youtube.com/channel/${channel.channelId}`;
}
