import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types";
import { ROLE_HOME } from "@/lib/roles";

export { ROLE_HOME };

/** Where users who have not picked worker or buyer yet are sent. */
export const ROLE_SETUP_PATH = "/setup-role";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role: Role;
  /** False until the person picked their own role (see /setup-role). */
  roleChosen: boolean;
}

/** Reads + memoises the Better Auth session for the current request. */
export const getSession = cache(async () => {
  const res = await auth.api.getSession({ headers: await headers() });
  if (!res?.user) return null;
  const u = res.user as SessionUser & Record<string, unknown>;
  return {
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      image: u.image ?? null,
      role: (u.role as Role) ?? "worker",
      roleChosen: Boolean(u.roleChosen),
    } satisfies SessionUser,
    session: res.session,
  };
});

/** Require any authenticated user; otherwise redirect to /login. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const s = await getSession();
  if (!s) redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  return s.user;
}

/**
 * Require a specific role; redirect to /login, the role setup step, or the
 * user's own home.
 */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  // Admins are never self-assigned, so they skip the picker.
  if (user.role !== "admin" && !user.roleChosen) {
    // The session cookie cache can lag a fresh choice — confirm on the row
    // before bouncing, otherwise a just-chosen role would loop back here.
    const row = await getCurrentUser();
    if (!row?.roleChosen) redirect(ROLE_SETUP_PATH);
  }
  if (user.role !== role) redirect(ROLE_HOME[user.role] ?? "/login");
  return user;
}

/** Full domain row for the signed-in user (or null). Memoised per request. */
export const getCurrentUser = cache(async () => {
  const s = await getSession();
  if (!s) return null;
  return prisma.user.findUnique({ where: { id: s.user.id } });
});
