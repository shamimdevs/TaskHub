import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth-session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole("admin");
  return <AppShell role="admin">{children}</AppShell>;
}
