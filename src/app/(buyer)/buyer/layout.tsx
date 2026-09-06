import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth-session";

export default async function BuyerLayout({ children }: LayoutProps<"/buyer">) {
  await requireRole("buyer");
  return <AppShell role="buyer">{children}</AppShell>;
}
