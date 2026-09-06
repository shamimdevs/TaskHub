import type { Role } from "@/types";

/** Landing route for each role after sign-in. Safe to import anywhere. */
export const ROLE_HOME: Record<Role, string> = {
  worker: "/worker/dashboard",
  buyer: "/buyer/dashboard",
  admin: "/admin/dashboard",
};

export function roleHome(role: string | undefined | null): string {
  return ROLE_HOME[(role as Role) ?? "worker"] ?? "/login";
}
