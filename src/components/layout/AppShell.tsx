"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setMobileNavOpen, setRole } from "@/redux/features/session/sessionSlice";
import { NAV, ROLE_META } from "@/lib/nav";
import type { Role } from "@/types";
import { APP_NAME } from "@/lib/constants";
import { Drawer } from "@/components/ui/Drawer";
import { IconButton } from "@/components/ui/IconButton";
import { SidebarNav } from "./SidebarNav";
import { BottomNav } from "./BottomNav";
import { Topbar } from "./Topbar";
import { RoleSwitcher } from "./RoleSwitcher";

function Brand({ role }: { role: Role }) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-brand-fg">
        <Icon size={18} />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-bold text-fg">{APP_NAME}</p>
        <p className="text-[11px] text-fg-muted">{meta.label}</p>
      </div>
    </div>
  );
}

export function AppShell({
  role,
  title,
  children,
}: {
  role: Role;
  title?: string;
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const mobileOpen = useAppSelector((s) => s.session.mobileNavOpen);
  const items = NAV[role];

  // keep the redux role in sync with the panel being viewed
  useEffect(() => {
    dispatch(setRole(role));
  }, [role, dispatch]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-4 border-r border-border bg-card p-4 lg:flex">
        <Brand role={role} />
        <div className="scroll-thin -mx-1 flex-1 overflow-y-auto px-1">
          <SidebarNav items={items} />
        </div>
        <RoleSwitcher />
      </aside>

      {/* Mobile drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => dispatch(setMobileNavOpen(false))}
        side="left"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <Brand role={role} />
          <IconButton
            icon={X}
            label="Close menu"
            onClick={() => dispatch(setMobileNavOpen(false))}
          />
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto p-4">
          <SidebarNav
            items={items}
            onNavigate={() => dispatch(setMobileNavOpen(false))}
          />
        </div>
        <div className="p-4">
          <RoleSwitcher />
        </div>
      </Drawer>

      {/* Main column */}
      <div className="flex min-w-0 flex-col">
        <Topbar title={title} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-3 pb-24 pt-4 sm:px-5 sm:pb-10 lg:pt-6">
          {children}
        </main>
        <BottomNav items={items} />
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  back?: { href: string; label?: string };
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-1 inline-block text-xs font-medium text-fg-muted hover:text-fg"
          >
            ← {back.label ?? "Back"}
          </Link>
        )}
        <h1 className="text-lg font-bold tracking-tight text-fg sm:text-xl">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-sm text-fg-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
