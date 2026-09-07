import "server-only";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * CSRF state shared by every social connect flow.
 *
 * The token goes out in the `state` query parameter *and* into an httpOnly
 * cookie; the callback only proceeds when the two match. Each provider keeps
 * its own cookie so a worker can start a Facebook link and a YouTube link in
 * two tabs without one clobbering the other's state.
 */

export type OAuthProvider = "facebook" | "youtube" | "instagram";

export function stateCookieName(provider: OAuthProvider): string {
  return `${provider}_oauth_state`;
}

export function newState(prefix = ""): string {
  const token = randomBytes(24).toString("base64url");
  return prefix ? `${prefix}.${token}` : token;
}

/** Redirect into the provider's dialog, remembering the state we sent. */
export function startOAuth(
  provider: OAuthProvider,
  dialogUrl: string,
  state: string,
): NextResponse {
  const res = NextResponse.redirect(dialogUrl);
  res.cookies.set(stateCookieName(provider), state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}

/** The state we sent for this provider, straight off the request cookies. */
export function readState(req: Request, provider: OAuthProvider): string | undefined {
  const name = stateCookieName(provider);
  return req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

/**
 * Send the person back to the page they started from, with a short status the
 * panel turns into a message. Clears the state cookie either way.
 */
export function finishOAuth(
  req: Request,
  provider: OAuthProvider,
  returnTo: string,
  params: Record<string, string>,
): NextResponse {
  const url = new URL(returnTo, req.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.delete(stateCookieName(provider));
  return res;
}
