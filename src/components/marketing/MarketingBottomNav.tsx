"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, Info, Mail, UserPlus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Item {
  label: string;
  href: string;
  icon: LucideIcon;
  /** render as the filled brand call-to-action */
  cta?: boolean;
}

const ITEMS: Item[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "About", href: "/about", icon: Info },
  { label: "Contact", href: "/contact", icon: Mail },
  { label: "Join", href: "/register", icon: UserPlus, cta: true },
];

/**
 * Mobile-only quick nav for the public/marketing pages. Mirrors the in-app
 * BottomNav so a phone visitor always has one-tap access to the key pages.
 * Hidden from `md` up, where the header nav takes over.
 */
export function MarketingBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur safe-bottom md:hidden">
      <ul className="grid grid-cols-5">
        {ITEMS.map((it) => {
          const active =
            it.href === "/"
              ? pathname === "/"
              : pathname === it.href || pathname.startsWith(it.href + "/");
          const Icon = it.icon;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                  it.cta
                    ? "text-brand"
                    : active
                      ? "text-brand"
                      : "text-fg-subtle",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full transition-colors",
                    it.cta
                      ? "bg-brand text-brand-fg shadow-soft"
                      : active
                        ? "bg-brand-50 text-brand-600"
                        : "text-current",
                  )}
                >
                  <Icon size={18} />
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
