"use client";

import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setRole } from "@/redux/features/session/sessionSlice";
import { ROLE_META } from "@/lib/nav";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

const ROLES: Role[] = ["worker", "buyer", "admin"];

/**
 * Design-pass helper: no auth yet, so this lets you jump between the three
 * panels. Remove once real auth lands.
 */
export function RoleSwitcher({ compact }: { compact?: boolean }) {
  const role = useAppSelector((s) => s.session.role);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const go = (r: Role) => {
    dispatch(setRole(r));
    router.push(ROLE_META[r].home);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-card-muted p-2",
        compact ? "" : "space-y-2",
      )}
    >
      {!compact && (
        <p className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
          <FlaskConical size={12} /> Preview as
        </p>
      )}
      <div className="grid grid-cols-3 gap-1">
        {ROLES.map((r) => {
          const active = r === role;
          return (
            <button
              key={r}
              onClick={() => go(r)}
              className={cn(
                "rounded-lg px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                active
                  ? "bg-fg text-bg"
                  : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
              )}
            >
              {ROLE_META[r].label.replace("Super ", "")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
