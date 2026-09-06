import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireApiUser, isResponse, apiError } from "@/lib/api";
import {
  facebookConfigured,
  facebookLoginUrl,
  type FacebookMode,
} from "@/lib/facebook";

export const STATE_COOKIE = "fb_oauth_state";

/**
 * Starts Facebook Login. `?as=page` is a buyer connecting a page to verify a
 * campaign against; `?as=profile` is a worker linking their own account so
 * their task proofs come from it. Both come back through one callback, which
 * reads the mode out of the state cookie.
 *
 * This is a top-level navigation, not a fetch: the browser follows the
 * redirect and the person approves once.
 */
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;
  if (!facebookConfigured) {
    return apiError(503, "Facebook integration is not configured on this server");
  }

  const asParam = new URL(req.url).searchParams.get("as");
  const mode: FacebookMode = asParam === "profile" ? "profile" : "page";
  if (mode === "page" && auth.role === "worker") {
    return apiError(403, "Workers link their own profile, not a page");
  }

  const state = `${mode}.${randomBytes(24).toString("base64url")}`;
  const res = NextResponse.redirect(facebookLoginUrl(state, mode));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
