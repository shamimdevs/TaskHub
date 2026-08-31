import { AppShell } from "@/components/layout/AppShell";

export default function BuyerLayout({ children }: LayoutProps<"/buyer">) {
  return <AppShell role="buyer">{children}</AppShell>;
}
