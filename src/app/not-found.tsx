import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold text-brand">404</p>
      <h1 className="mt-3 text-lg font-semibold text-fg">Page not found</h1>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-fg hover:bg-brand-600"
      >
        <Home size={16} /> Back home
      </Link>
    </div>
  );
}
