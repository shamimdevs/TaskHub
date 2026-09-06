import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse } from "@/lib/api";
import {
  exchangeCode,
  getProfile,
  listManagedPages,
  longLivedUserToken,
  FacebookError,
} from "@/lib/facebook";
import { STATE_COOKIE } from "../connect/route";

const RETURN = {
  page: "/buyer/campaigns/new",
  profile: "/worker/profile",
} as const;

type Mode = keyof typeof RETURN;

function back(req: Request, mode: Mode, params: Record<string, string>) {
  const url = new URL(RETURN[mode], req.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.delete(STATE_COOKIE);
  return res;
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
  const expected = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);

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
    const message = e instanceof FacebookError ? e.message : "Connection failed";
    console.error("[facebook] callback failed:", message);
    return back(req, mode, { fb: "failed" });
  }
}

/** Buyer flow: store every page they administer, each with its own token. */
async function connectPages(req: Request, userId: string, userToken: string) {
  const pages = await listManagedPages(userToken);
  if (!pages.length) return back(req, "page", { fb: "no_pages" });

  for (const p of pages) {
    await prisma.facebookPage.upsert({
      where: { pageId: p.pageId },
      update: {
        // Re-connecting hands the page to whoever proved they administer it.
        ownerId: userId,
        name: p.name,
        username: p.username ?? null,
        accessToken: p.accessToken,
        followers: p.followers,
        lastError: null,
      },
      create: {
        ownerId: userId,
        pageId: p.pageId,
        name: p.name,
        username: p.username ?? null,
        accessToken: p.accessToken,
        followers: p.followers,
      },
    });
  }
  return back(req, "page", { fb: "connected", pages: String(pages.length) });
}

/** Worker flow: bind this Facebook account to the TaskHub account. */
async function linkProfile(req: Request, userId: string, userToken: string) {
  const profile = await getProfile(userToken);

  try {
    await prisma.socialAccount.upsert({
      where: { userId_provider: { userId, provider: "facebook" } },
      update: {
        providerId: profile.providerId,
        name: profile.name,
        profileUrl: profile.profileUrl ?? null,
      },
      create: {
        userId,
        provider: "facebook",
        providerId: profile.providerId,
        name: profile.name,
        profileUrl: profile.profileUrl ?? null,
      },
    });
  } catch (e) {
    // The (provider, providerId) unique index: this Facebook account is
    // already linked to a different TaskHub worker.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return back(req, "profile", { fb: "taken" });
    }
    throw e;
  }

  return back(req, "profile", {
    fb: "linked",
    ...(profile.profileUrl ? {} : { needsUrl: "1" }),
  });
}
