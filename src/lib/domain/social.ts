import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { LinkMethod, Platform, SocialAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { facebookConfigured } from "@/lib/facebook";
import { instagramConfigured, instagramProfileUrl } from "@/lib/instagram";
import {
  YouTubeError,
  channelUrl,
  getChannelByHandle,
  refreshAccessToken,
  youtubeConfigured,
  youtubeReadConfigured,
} from "@/lib/youtube";
import { DomainError } from "./errors";

/**
 * A worker's linked accounts — the thing every proof is anchored to.
 *
 * Two rules hold the whole scheme up:
 *
 *  1. One social account belongs to exactly one TaskHub worker. Without it a
 *     single Instagram handle could farm the same task through twenty
 *     accounts, which is the entire fraud model for a site like this.
 *  2. The profile link on a submission comes from the linked account, never
 *     from what was typed into the form.
 *
 * How strongly a link is held varies by platform, and the UI says which:
 * `oauth` the platform confirmed it; `code` the worker proved control by
 * putting our one-time code on their public profile; `claimed` they only typed
 * the handle, and rule 1 is all that stands behind it.
 */

/** Which providers this server can actually run an OAuth link for. */
export function availableProviders(): Partial<Record<Platform, boolean>> {
  return {
    facebook: facebookConfigured,
    youtube: youtubeConfigured,
    instagram: instagramConfigured,
  };
}

/** Providers a worker may self-claim by handle when OAuth is out of reach. */
export const CLAIMABLE: Platform[] = [
  "youtube",
  "instagram",
  "facebook",
  "tiktok",
  "twitter",
];

/**
 * Providers whose public profile we can read back, and so whose claim can be
 * settled automatically with a one-time code.
 *
 * YouTube alone, and only because the Data API returns a channel's public
 * description for an API key. Facebook and Instagram serve a login wall to
 * anything that is not their own app, so there is no honest way to check a
 * code on those without the app credentials — a worker there stays
 * self-declared until OAuth is configured, and the panel says so plainly
 * rather than dangling a check that would never run.
 */
export function codeVerifiable(provider: Platform): boolean {
  return provider === "youtube" && youtubeReadConfigured;
}

/**
 * Shortest gap between two on-demand checks of the same account.
 *
 * Every check spends YouTube quota, and the cron is already checking on its
 * own, so the button is a convenience rather than the mechanism. Without this
 * one impatient worker could drain the daily quota for everybody.
 */
export const CHECK_COOLDOWN_MS = 30_000;

/**
 * How long a claim keeps getting checked. A code nobody ever put up should
 * stop costing us a request every few minutes forever; the worker can always
 * re-claim to get a fresh one.
 */
const CLAIM_MAX_AGE_MS = 30 * 86_400_000;

/**
 * A short, unambiguous code for the worker to paste onto their profile.
 * Crockford-ish alphabet: no O/0 or I/1 to mistype.
 */
export function newVerifyCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `TASKHUB-${out}`;
}

/**
 * A self-claimed handle, stored so it can never be mistaken for a real
 * provider id while still colliding with another worker's claim of the same
 * handle — which is exactly what rule 1 needs it to do.
 */
export function claimedId(provider: Platform, handle: string): string {
  return `claimed:${provider}:${normalizeHandle(handle)}`;
}

export function normalizeHandle(input: string): string {
  const trimmed = input.trim();
  // Accept a full profile URL as readily as a bare handle — people paste both.
  const fromUrl = /^https?:\/\//i.test(trimmed)
    ? (() => {
        try {
          return new URL(trimmed).pathname.split("/").filter(Boolean)[0] ?? "";
        } catch {
          return "";
        }
      })()
    : trimmed;
  return (fromUrl || trimmed).replace(/^@/, "").toLowerCase();
}

export interface LinkInput {
  userId: string;
  provider: Platform;
  providerId: string;
  name: string;
  username?: string | null;
  profileUrl?: string | null;
  linkMethod?: LinkMethod;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  scope?: string | null;
}

/** Raised when the account is already held by a different TaskHub worker. */
export class AccountTakenError extends DomainError {
  constructor(provider: Platform) {
    super(`That ${provider} account is already linked to another worker`, 409);
  }
}

/**
 * Attach an account to a worker, replacing whatever they had on that provider.
 *
 * A confirmed link displaces anyone else's *claim* on the same handle: someone
 * who merely typed the handle loses it to the person who proved it. A claim
 * never displaces anything.
 */
export async function linkAccount(input: LinkInput): Promise<SocialAccount> {
  const method: LinkMethod = input.linkMethod ?? "oauth";

  try {
    return await prisma.$transaction(async (tx) => {
      if (method === "oauth" && input.username) {
        await tx.socialAccount.deleteMany({
          where: {
            provider: input.provider,
            providerId: claimedId(input.provider, input.username),
            linkMethod: "claimed",
            userId: { not: input.userId },
          },
        });
      }

      const data = {
        providerId: input.providerId,
        name: input.name,
        username: input.username ?? null,
        profileUrl: input.profileUrl ?? null,
        linkMethod: method,
        accessToken: input.accessToken ?? null,
        refreshToken: input.refreshToken ?? null,
        tokenExpiresAt: input.tokenExpiresAt ?? null,
        scope: input.scope ?? null,
        lastError: null,
        lastCheckedAt: null,
      };

      return tx.socialAccount.upsert({
        where: {
          userId_provider: { userId: input.userId, provider: input.provider },
        },
        update: data,
        create: { userId: input.userId, provider: input.provider, ...data },
      });
    });
  } catch (e) {
    // The (provider, providerId) unique index — rule 1 doing its job.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new AccountTakenError(input.provider);
    }
    throw e;
  }
}

/**
 * Worker types their own handle, for platforms that cannot confirm one.
 *
 * Where we can read the profile back, this also issues the code that will
 * settle it — so the account is not parked in a state nobody can ever move it
 * out of. `checkProfileCode` picks it up from there, automatically.
 */
export async function claimAccount(
  userId: string,
  provider: Platform,
  handle: string,
): Promise<SocialAccount> {
  if (!CLAIMABLE.includes(provider)) {
    throw new DomainError(`${provider} accounts have to be linked, not claimed`);
  }
  const username = normalizeHandle(handle);
  if (!/^[a-z0-9._-]{2,60}$/.test(username)) {
    throw new DomainError("That does not look like a valid username");
  }

  const account = await linkAccount({
    userId,
    provider,
    providerId: claimedId(provider, username),
    name: `@${username}`,
    username,
    profileUrl:
      provider === "instagram" ? instagramProfileUrl(username) : null,
    linkMethod: "claimed",
  });

  if (!codeVerifiable(provider)) return account;

  const updated = await prisma.socialAccount.update({
    where: { id: account.id },
    data: { verifyCode: newVerifyCode(), verifyCodeAt: new Date() },
  });

  // Try immediately: a worker who already put the code up, or who is
  // re-claiming a handle they have proved before, is done without waiting for
  // the next cron pass.
  return (await checkProfileCode(updated)) ?? updated;
}

/**
 * Read a claimed profile and see whether our code is on it. Returns the
 * promoted account when it is, null otherwise.
 *
 * This is the whole point of the code: it proves the person typing the handle
 * into TaskHub also controls the account, without needing the platform to
 * vouch for them. It costs one public API read.
 */
export async function checkProfileCode(
  account: SocialAccount,
): Promise<SocialAccount | null> {
  if (account.linkMethod !== "claimed") return null;
  if (!account.verifyCode || !account.username) return null;
  if (!codeVerifiable(account.provider)) return null;

  let channel;
  try {
    channel = await getChannelByHandle(account.username);
  } catch (e) {
    const message = e instanceof YouTubeError ? e.message : "Could not reach YouTube";
    await noteAccountError(account.id, message);
    return null;
  }

  if (!channel) {
    await noteAccountError(
      account.id,
      `No YouTube channel found for @${account.username}`,
    );
    return null;
  }

  if (!channel.description?.includes(account.verifyCode)) {
    await noteAccountError(
      account.id,
      "Code not found on the channel yet — add it to your About description",
    );
    return null;
  }

  try {
    return await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        // Now that the channel is proved, hold its real id rather than the
        // placeholder a claim starts life with.
        providerId: channel.channelId,
        name: channel.title,
        username: channel.handle ?? account.username,
        profileUrl: channelUrl(channel),
        linkMethod: "code",
        verifyCode: null,
        verifyCodeAt: null,
        lastError: null,
        lastCheckedAt: new Date(),
      },
    });
  } catch (e) {
    // Somebody already linked this exact channel through OAuth. Their claim
    // is the stronger one, so this claim does not get to take it.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      await noteAccountError(
        account.id,
        "That channel is already linked to another TaskHub worker",
      );
      return null;
    }
    throw e;
  }
}

/**
 * One pass over every claim still waiting on its code. Run from the same cron
 * as the submission checks, so a worker who adds the code never has to come
 * back and press anything.
 */
export async function runProfileCodeVerification(): Promise<{
  checked: number;
  verified: number;
}> {
  const out = { checked: 0, verified: 0 };
  if (!youtubeReadConfigured) return out;

  const waiting = await prisma.socialAccount.findMany({
    where: {
      linkMethod: "claimed",
      provider: "youtube",
      verifyCode: { not: null },
      username: { not: null },
      verifyCodeAt: { gte: new Date(Date.now() - CLAIM_MAX_AGE_MS) },
    },
    orderBy: { connectedAt: "asc" },
    take: 200,
  });

  for (const account of waiting) {
    out.checked++;
    if (await checkProfileCode(account)) out.verified++;
  }
  return out;
}

/**
 * A usable YouTube access token for this account, refreshing it when the old
 * one has run out.
 *
 * Returns null when the worker's grant is gone rather than throwing: their
 * pending submissions should go to a human, not be rejected for something that
 * is not their fault. The reason is recorded on the account so the panel can
 * ask them to reconnect.
 */
export async function youtubeAccessToken(
  account: SocialAccount,
): Promise<string | null> {
  const fresh =
    account.accessToken &&
    account.tokenExpiresAt &&
    // A minute of headroom: a token that expires mid-request is no use.
    account.tokenExpiresAt.getTime() - 60_000 > Date.now();
  if (fresh) return account.accessToken;

  if (!account.refreshToken) {
    await noteAccountError(account.id, "Reconnect YouTube to keep proofs automatic");
    return null;
  }

  try {
    const tokens = await refreshAccessToken(account.refreshToken);
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        accessToken: tokens.accessToken,
        // Google only re-issues a refresh token sometimes; keep the old one.
        refreshToken: tokens.refreshToken ?? account.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        lastError: null,
      },
    });
    return tokens.accessToken;
  } catch (e) {
    const revoked = e instanceof YouTubeError && e.authExpired;
    await noteAccountError(
      account.id,
      revoked
        ? "YouTube access was revoked — reconnect to keep proofs automatic"
        : "Could not reach YouTube",
    );
    return null;
  }
}

export async function noteAccountError(id: string, message: string): Promise<void> {
  await prisma.socialAccount.update({
    where: { id },
    data: { lastError: message, lastCheckedAt: new Date() },
  });
}

/** Public shape for the panel. Tokens never leave the server. */
export function publicAccount(a: SocialAccount) {
  return {
    id: a.id,
    provider: a.provider,
    name: a.name,
    username: a.username,
    profileUrl: a.profileUrl,
    linkMethod: a.linkMethod,
    /** True once ownership was actually proved, by OAuth or by profile code. */
    verified: a.linkMethod !== "claimed",
    /** True when we can ask the provider about this worker directly. */
    autoCheckable: a.provider === "youtube" && Boolean(a.refreshToken),
    /** Set while a claim is waiting for its code to appear on the profile. */
    verifyCode: a.verifyCode,
    /** Whether that wait can ever end on this server. */
    codeVerifiable: codeVerifiable(a.provider),
    lastError: a.lastError,
    connectedAt: a.connectedAt,
  };
}
