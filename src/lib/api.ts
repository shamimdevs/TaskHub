import "server-only";
import { Prisma } from "@prisma/client";
import type { ZodType } from "zod";
import { auth } from "@/lib/auth";
import type { Role } from "@/types";

/* ------------------------------------------------------------------ *
 * Serialisation — Prisma Decimal -> number, Date -> ISO string.
 * Applied to every payload so the wire format matches src/types.
 * ------------------------------------------------------------------ */
export function serialize<T>(value: T): T {
  return walk(value) as T;
}

function walk(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (v instanceof Prisma.Decimal) return v.toNumber();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(walk);
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = walk(val);
    }
    return out;
  }
  return v;
}

/* ------------------------------------------------------------------ *
 * Responses
 * ------------------------------------------------------------------ */
export function json<T>(data: T, init?: ResponseInit): Response {
  return Response.json(serialize(data), init);
}

export function apiError(status: number, message: string, extra?: Record<string, unknown>): Response {
  return Response.json({ error: message, ...extra }, { status });
}

/* ------------------------------------------------------------------ *
 * Auth guards for Route Handlers
 * ------------------------------------------------------------------ */
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
}

async function sessionUser(req: Request): Promise<ApiUser | null> {
  const res = await auth.api.getSession({ headers: req.headers });
  if (!res?.user) return null;
  const u = res.user as Record<string, unknown>;
  return {
    id: u.id as string,
    name: u.name as string,
    email: u.email as string,
    role: (u.role as Role) ?? "worker",
    emailVerified: Boolean(u.emailVerified),
  };
}

/** Returns the signed-in user, or a 401 Response to return from the handler. */
export async function requireApiUser(req: Request): Promise<ApiUser | Response> {
  const user = await sessionUser(req);
  if (!user) return apiError(401, "Not authenticated");
  return user;
}

/** Returns the signed-in user if their role is allowed, else 401/403. */
export async function requireApiRole(
  req: Request,
  roles: Role | Role[],
): Promise<ApiUser | Response> {
  const user = await sessionUser(req);
  if (!user) return apiError(401, "Not authenticated");
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) return apiError(403, "Forbidden");
  return user;
}

export function isResponse(v: unknown): v is Response {
  return v instanceof Response;
}

/* ------------------------------------------------------------------ *
 * Body parsing
 * ------------------------------------------------------------------ */
export async function parseBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<T | Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return apiError(400, "Invalid JSON body");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return apiError(422, "Validation failed", {
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }
  return parsed.data;
}

/* ------------------------------------------------------------------ *
 * Pagination
 * ------------------------------------------------------------------ */
export function pageParams(req: Request, defaultSize = 20) {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || defaultSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
