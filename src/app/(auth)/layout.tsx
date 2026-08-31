import Link from "next/link";
import { BadgeDollarSign, Megaphone, ShieldCheck, Sparkles } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      {/* Brand side (desktop) */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 to-accent-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15">
            <Sparkles size={18} />
          </span>
          {APP_NAME}
        </Link>
        <div className="space-y-6">
          <h2 className="max-w-sm text-3xl font-bold leading-tight">
            One account. Earn or promote — your choice.
          </h2>
          <ul className="space-y-3 text-sm text-white/90">
            <li className="flex gap-3">
              <BadgeDollarSign size={18} className="mt-0.5 shrink-0" />
              Workers complete simple tasks and cash out via bKash / Nagad.
            </li>
            <li className="flex gap-3">
              <Megaphone size={18} className="mt-0.5 shrink-0" />
              Buyers get 100% real, human followers — no bots.
            </li>
            <li className="flex gap-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0" />
              Rewards held for verification. Fair for everyone.
            </li>
          </ul>
        </div>
        <p className="text-xs text-white/70">
          © {new Date().getFullYear()} {APP_NAME}. Built for mobile.
        </p>
      </div>

      {/* Form side */}
      <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2 text-lg font-bold text-fg lg:hidden"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-brand-fg">
              <Sparkles size={18} />
            </span>
            {APP_NAME}
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
