import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth-session";

export default async function WorkerLayout({ children }: LayoutProps<"/worker">) {
  await requireRole("worker");
  return <AppShell role="worker">{children}</AppShell>;
}
