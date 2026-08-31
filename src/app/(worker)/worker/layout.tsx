import { AppShell } from "@/components/layout/AppShell";

export default function WorkerLayout({ children }: LayoutProps<"/worker">) {
  return <AppShell role="worker">{children}</AppShell>;
}
