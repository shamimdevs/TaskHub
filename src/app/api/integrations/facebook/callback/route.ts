import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse } from "@/lib/api";
import { finishOAuth, readState } from "@/lib/oauth-state";
import {
  exchangeCode,
  getProfile,
  listManagedPages,
  longLivedUserToken,
  FacebookError,
} from "@/lib/facebook";
import { AccountTakenError, linkAccount } from "@/lib/domain/social";

const RETURN = {
  page: "/buyer/campaigns/new",
  profile: "/worker/accounts",
} as const;

type Mode = keyof typeof RETURN;

function back(req: Request, mode: Mode, params: Record<string, string>) {
  return finishOAuth(req, "facebook", RETURN[mode], params);
}

/**
 * Facebook sends everyone back here. The state cookie says which flow it was:
 * a buyer connecting pages, or a worker linking their own profile.
 */
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = readState(req, "facebook");

  const mode: Mode = expected?.startsWith("profile.") ? "profile" : "page";

  if (url.searchParams.get("error")) return back(req, mode, { fb: "cancelled" });
  if (!code || !state || !expected || state !== expected) {
    return back(req, mode, { fb: "invalid_state" });
  }

  try {
    const userToken = await longLivedUserToken(await exchangeCode(code));
    return mode === "profile"
      ? await linkProfile(req, auth.id, userToken)
      : await connectPages(req, auth.id, userToken);
  } catch (e) {
    if (e instanceof AccountTakenError) return back(req, "profile", { fb: "taken" });
    const message = e instanceof FacebookError ? e.message : "Connection failed";
    console.error("[facebook] callback failed:", message);
    return back(req, mode, { fb: "failed" });
  }
}

/**
 * Buyer flow: store every page they administer, each with its own token, plus
 * the Instagram business account behind it where there is one — that account
 * is the only thing an Instagram campaign can be measured against.
 */
async function connectPages(req: Request, userId: string, userToken: string) {
  const pages = await listManagedPages(userToken);
  if (!pages.length) return back(req, "page", { fb: "no_pages" });

  for (const p of pages) {
    const shared = {
      name: p.name,
      username: p.username ?? null,
      accessToken: p.accessToken,
      followers: p.followers,
      instagramId: p.instagram?.id ?? null,
      instagramUsername: p.instagram?.username ?? null,
      instagramFollowers: p.instagram?.followers ?? null,
    };
    await prisma.facebookPage.upsert({
      where: { pageId: p.pageId },
      // Re-connecting hands the page to whoever proved they administer it.
      update: { ownerId: userId, lastError: null, ...shared },
      create: { ownerId: userId, pageId: p.pageId, ...shared },
    });
  }

  const withInstagram = pages.filter((p) => p.instagram).length;
  return back(req, "page", {
    fb: "connected",
    pages: String(pages.length),
    ...(withInstagram ? { ig: String(withInstagram) } : {}),
  });
}

/** Worker flow: bind this Facebook account to the TaskHub account. */
async function linkProfile(req: Request, userId: string, userToken: string) {
  const profile = await getProfile(userToken);

  await linkAccount({
    userId,
    provider: "facebook",
    providerId: profile.providerId,
    name: profile.name,
    profileUrl: profile.profileUrl ?? null,
    linkMethod: "oauth",
  });

  return back(req, "profile", {
    fb: "linked",
    ...(profile.profileUrl ? {} : { needsUrl: "1" }),
  });
}
