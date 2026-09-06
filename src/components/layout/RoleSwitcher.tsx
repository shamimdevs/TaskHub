"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Misc";
import { authClient } from "@/lib/auth-client";
import { useGetMeQuery } from "@/redux/features/session/sessionApi";
import { cn } from "@/lib/utils";

/**
 * Account card shown at the bottom of the sidebar / mobile drawer: identifies
 * the signed-in user and signs them out.
 */
export function RoleSwitcher({ compact }: { compact?: boolean }) {
  const { data: me } = useGetMeQuery();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await authClient.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card-muted p-2",
        compact ? "" : "space-y-2",
      )}
    >
      <div className="flex items-center gap-2.5 px-1 py-1">
        <Avatar name={me?.name ?? "TaskHub user"} src={me?.avatarUrl} size={32} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-fg">
            {me?.name ?? "TaskHub user"}
          </p>
          <p className="truncate text-[11px] text-fg-muted">{me?.email ?? ""}</p>
        </div>
      </div>
      <button
        onClick={signOut}
        disabled={busy}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger-soft disabled:opacity-60"
      >
        <LogOut size={14} />
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
