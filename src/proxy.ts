import { NextResponse, type NextRequest } from "next/server";
import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import type { Role } from "@/types";
import { ROLE_HOME } from "@/lib/roles";

const PANEL_PREFIXES: { prefix: string; role: Role }[] = [
  { prefix: "/worker", role: "worker" },
  { prefix: "/buyer", role: "buyer" },
  { prefix: "/admin", role: "admin" },
];

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const panel = PANEL_PREFIXES.find(
    (p) => pathname === p.prefix || pathname.startsWith(p.prefix + "/"),
  );
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!panel && !isAuthPage) return NextResponse.next();

  const hasSession = Boolean(getSessionCookie(request));
  const cache = hasSession
    ? await getCookieCache(request, { secret: process.env.BETTER_AUTH_SECRET }).catch(() => null)
    : null;
  const role = (cache?.user as { role?: Role } | undefined)?.role;

  // Protected panel routes -------------------------------------------------
  if (panel) {
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    if (role && role !== panel.role) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
    return NextResponse.next();
  }

  // Auth pages — bounce signed-in users to their dashboard ----------------
  if (isAuthPage && hasSession && role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/worker/:path*",
    "/buyer/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password/:path*",
    "/reset-password/:path*",
    "/verify-email/:path*",
  ],
};
