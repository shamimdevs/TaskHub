import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ListChecks,
  ClipboardCheck,
  Wallet,
  ArrowDownToLine,
  Users,
  Megaphone,
  PlusCircle,
  BadgeDollarSign,
  ShieldCheck,
  Receipt,
  Settings,
  Bell,
  UserRound,
  Gift,
  FileCheck2,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** show in the mobile bottom bar (max 5 recommended) */
  bottom?: boolean;
}

export const NAV: Record<Role, NavItem[]> = {
  worker: [
    { label: "Dashboard", href: "/worker/dashboard", icon: LayoutDashboard, bottom: true },
    { label: "Available tasks", href: "/worker/tasks", icon: ListChecks, bottom: true },
    { label: "My submissions", href: "/worker/submissions", icon: ClipboardCheck, bottom: true },
    { label: "Wallet", href: "/worker/wallet", icon: Wallet, bottom: true },
    { label: "Withdraw", href: "/worker/withdraw", icon: ArrowDownToLine },
    { label: "Referrals", href: "/worker/referrals", icon: Gift },
    { label: "Notifications", href: "/worker/notifications", icon: Bell },
    { label: "Profile", href: "/worker/profile", icon: UserRound, bottom: true },
  ],
  buyer: [
    { label: "Dashboard", href: "/buyer/dashboard", icon: LayoutDashboard, bottom: true },
    { label: "Campaigns", href: "/buyer/campaigns", icon: Megaphone, bottom: true },
    { label: "New campaign", href: "/buyer/campaigns/new", icon: PlusCircle, bottom: true },
    { label: "Add funds", href: "/buyer/deposit", icon: BadgeDollarSign, bottom: true },
    { label: "Wallet", href: "/buyer/wallet", icon: Wallet },
    { label: "Notifications", href: "/buyer/notifications", icon: Bell },
    { label: "Profile", href: "/buyer/profile", icon: UserRound, bottom: true },
  ],
  admin: [
    { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard, bottom: true },
    { label: "Users", href: "/admin/users", icon: Users, bottom: true },
    { label: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
    { label: "Verification", href: "/admin/submissions", icon: FileCheck2, bottom: true },
    { label: "Deposits", href: "/admin/deposits", icon: BadgeDollarSign, bottom: true },
    { label: "Withdrawals", href: "/admin/withdrawals", icon: ArrowDownToLine },
    { label: "Transactions", href: "/admin/transactions", icon: Receipt },
    { label: "Settings", href: "/admin/settings", icon: Settings, bottom: true },
  ],
};

export const ROLE_META: Record<
  Role,
  { label: string; home: string; icon: LucideIcon; blurb: string }
> = {
  worker: {
    label: "Worker",
    home: "/worker/dashboard",
    icon: BadgeDollarSign,
    blurb: "Complete tasks, earn dollars",
  },
  buyer: {
    label: "Buyer",
    home: "/buyer/dashboard",
    icon: Megaphone,
    blurb: "Promote with real people",
  },
  admin: {
    label: "Super Admin",
    home: "/admin/dashboard",
    icon: ShieldCheck,
    blurb: "Run the whole platform",
  },
};
