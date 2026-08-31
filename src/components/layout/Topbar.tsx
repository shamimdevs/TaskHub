"use client";

import Link from "next/link";
import { Bell, Menu, Wallet } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setMobileNavOpen } from "@/redux/features/session/sessionSlice";
import { useGetWalletQuery } from "@/redux/features/wallet/walletApi";
import { useGetNotificationsQuery } from "@/redux/features/notifications/notificationsApi";
import { ROLE_META } from "@/lib/nav";
import { formatMoney } from "@/lib/utils";
import { Avatar } from "@/components/ui/Misc";
import { IconButton } from "@/components/ui/IconButton";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({ title }: { title?: string }) {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.session.role);
  const { data: wallet } = useGetWalletQuery();
  const { data: notes } = useGetNotificationsQuery();
  const unread = notes?.filter((n) => !n.read).length ?? 0;
  const meta = ROLE_META[role];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/90 px-3 backdrop-blur sm:px-5 lg:h-16">
      <IconButton
        icon={Menu}
        label="Open menu"
        className="lg:hidden"
        onClick={() => dispatch(setMobileNavOpen(true))}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg sm:text-base">
          {title ?? meta.label}
        </p>
      </div>

      {role !== "admin" && (
        <Link
          href={role === "worker" ? "/worker/wallet" : "/buyer/wallet"}
          className="hidden items-center gap-1.5 rounded-lg border border-border bg-bg-subtle px-2.5 py-1.5 text-sm font-semibold text-fg xs:inline-flex"
        >
          <Wallet size={15} className="text-brand" />
          {formatMoney(wallet?.user.balance ?? 0)}
        </Link>
      )}

      <div className="hidden sm:block">
        <ThemeToggle />
      </div>

      <Link
        href={`/${role}/notifications`}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-fg-muted hover:bg-bg-subtle hover:text-fg"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </Link>

      <Link href={`/${role}/profile`} aria-label="Profile">
        <Avatar name={wallet?.user.name ?? meta.label} size={32} />
      </Link>
    </header>
  );
}
