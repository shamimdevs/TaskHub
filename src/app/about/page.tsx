import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Clock,
  HandCoins,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { APP_NAME, FEES, LIMITS, RATE_RANGE } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description: `What ${APP_NAME} is, who it's for, and how we keep engagement genuine.`,
};

const STATS = [
  {
    icon: HandCoins,
    value: `${formatMoney(RATE_RANGE.min)}–${formatMoney(RATE_RANGE.max)}`,
    label: "Earned per verified action",
  },
  { icon: Wallet, value: formatMoney(LIMITS.minWithdraw), label: "Minimum withdrawal" },
  { icon: Clock, value: `${LIMITS.holdDaysRange[0]}–${LIMITS.holdDaysRange[1]} days`, label: "Verification hold" },
  { icon: ShieldCheck, value: `${FEES.withdrawFeePct}%`, label: "Withdrawal fee" },
];

const VALUES = [
  {
    icon: Users,
    title: "Real people only",
    text: "Every subscribe, view, watch-hour, like and follow is done by a logged-in human worker. No bots, no bought accounts, no emulator farms.",
  },
  {
    icon: BadgeCheck,
    title: "Proof and a hold period",
    text: `Workers submit a screenshot for each task, and rewards are held for ${LIMITS.holdDaysRange[0]}–${LIMITS.holdDaysRange[1]} days so engagement that gets undone is caught and reversed.`,
  },
  {
    icon: Wallet,
    title: "Local, transparent payments",
    text: "Buyers top up and workers cash out with bKash and Nagad. Rates are per action, shown upfront, with no subscriptions.",
  },
  {
    icon: ShieldCheck,
    title: "Fair for both sides",
    text: "Buyers only pay for actions that are verified. Workers are protected from unfair rejections by a clear review process.",
  },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">
        About us
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
        Growth for creators, income for everyday people.
      </h1>
      <p className="mt-4 text-base leading-relaxed text-fg-muted">
        {APP_NAME} is a micro-task marketplace built for the Bangladeshi creator
        economy. Creators and small businesses use it to grow their YouTube
        channels &mdash; real subscribers, watch time, views and comments &mdash;
        as well as followers on Facebook, Instagram and TikTok. On the other side,
        anyone with a phone can earn dollars by completing those tasks and cashing
        out through bKash or Nagad.
      </p>

      {/* Stats */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-500/15">
              <s.icon size={16} />
            </span>
            <p className="mt-2.5 text-lg font-bold tracking-tight text-fg">
              {s.value}
            </p>
            <p className="text-xs leading-tight text-fg-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Why we exist */}
      <section className="mt-12">
        <h2 className="text-lg font-bold tracking-tight text-fg">Why we built it</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-fg-muted">
          <p>
            YouTube&rsquo;s monetisation bar &mdash; 1,000 subscribers and 4,000
            watch hours &mdash; is hard to clear for a new channel, and most
            &ldquo;growth&rdquo; services sell bot traffic that gets wiped and can
            get a channel penalised. Meanwhile, a lot of capable people in
            Bangladesh want flexible ways to earn from their phone.
          </p>
          <p>
            {APP_NAME} connects those two needs directly: creators fund real
            engagement, workers do the actions by hand and get paid per verified
            task, and the platform verifies the work and settles payments in
            local currency.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mt-12">
        <h2 className="text-lg font-bold tracking-tight text-fg">How it works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="text-sm font-bold text-brand-700">For workers</p>
            <ol className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>1. Sign up free with your phone.</li>
              <li>2. Pick a task &mdash; subscribe, watch, like or comment.</li>
              <li>3. Submit a screenshot as proof.</li>
              <li>4. Reward clears after the hold, then withdraw.</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="text-sm font-bold text-fg">For buyers</p>
            <ol className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>1. Add funds via bKash / Nagad + TrxID.</li>
              <li>2. Create a campaign with your link and quantity.</li>
              <li>3. Real people complete the actions.</li>
              <li>4. Pay only for what&rsquo;s verified.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mt-12">
        <h2 className="text-lg font-bold tracking-tight text-fg">
          What we stand for
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-500/15">
                <v.icon size={18} />
              </span>
              <p className="mt-3 text-sm font-semibold text-fg">{v.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-500/15">
          <Sparkles size={22} />
        </span>
        <p className="mt-3 text-base font-semibold text-fg">
          Join {APP_NAME} today
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
          Start earning in minutes, or launch your first growth campaign.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-fg hover:bg-brand-600"
          >
            Get started
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border-strong bg-card px-5 text-sm font-semibold text-fg hover:bg-bg-subtle"
          >
            Contact us
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
