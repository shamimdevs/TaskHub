import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoleSetup } from "@/components/panels/auth/RoleSetup";
import { getCurrentUser, requireUser, ROLE_HOME } from "@/lib/auth-session";

export const metadata: Metadata = { title: "Choose your role" };

/**
 * Post-login step for accounts that never picked a side — a Google sign-up
 * lands on the default "worker" until this is answered. Everyone who has
 * already chosen (and every admin) is bounced straight to their dashboard,
 * which also makes this a safe universal landing page after social sign-in.
 */
export default async function SetupRolePage() {
  const session = await requireUser("/setup-role");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin" || user.roleChosen) {
    redirect(ROLE_HOME[user.role] ?? "/login");
  }

  return <RoleSetup name={session.name} />;
}
