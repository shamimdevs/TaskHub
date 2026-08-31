import { AppShell } from "@/components/layout/AppShell";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AppShell role="admin">{children}</AppShell>;
}
