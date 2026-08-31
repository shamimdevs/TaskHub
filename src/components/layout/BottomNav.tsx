"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const bottomItems = items.filter((i) => i.bottom).slice(0, 5);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur safe-bottom lg:hidden">
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${bottomItems.length}, 1fr)` }}
      >
        {bottomItems.map((it) => {
          const active =
            pathname === it.href ||
            (it.href !== "/" && pathname.startsWith(it.href + "/"));
          const Icon = it.icon;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-brand" : "text-fg-subtle",
                )}
              >
                <Icon size={20} />
                <span className="max-w-[64px] truncate">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
