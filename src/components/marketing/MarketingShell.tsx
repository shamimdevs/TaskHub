import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

/**
 * Shared chrome for the standalone marketing pages (About, Contact, Terms):
 * sticky brand header, centered content column, and a footer with the
 * cross-links. Keeps those pages consistent without touching the landing page.
 */
export function MarketingShell({
  children,
  size = "default",
}: {
  children: React.ReactNode;
  /** "wide" widens the content column for grids (e.g. the jobs list). */
  size?: "default" | "wide";
}) {
  const max = size === "wide" ? "max-w-5xl" : "max-w-3xl";
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
        <div
          className={`mx-auto flex h-16 items-center justify-between px-4 sm:px-6 ${max}`}
        >
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-fg">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-brand-fg">
              <Sparkles size={18} />
            </span>
            {APP_NAME}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-fg-muted hover:bg-bg-subtle hover:text-fg"
          >
            <ArrowLeft size={15} /> Home
          </Link>
        </div>
      </header>

      <main className={`mx-auto px-4 py-12 sm:px-6 sm:py-16 ${max}`}>
        {children}
      </main>

      <footer className="border-t border-border">
        <div
          className={`mx-auto flex flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-fg-muted sm:flex-row sm:px-6 ${max}`}
        >
          <p>
            © {new Date().getFullYear()} {APP_NAME}
          </p>
          <nav className="flex gap-4">
            <Link href="/jobs" className="hover:text-fg">
              Jobs
            </Link>
            <Link href="/about" className="hover:text-fg">
              About
            </Link>
            <Link href="/contact" className="hover:text-fg">
              Contact
            </Link>
            <Link href="/terms" className="hover:text-fg">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
