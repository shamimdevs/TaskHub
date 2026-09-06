import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Clock,
  Eye,
  MessageCircle,
  Megaphone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  Users,
  Wallet,
  PlaySquare,
} from "lucide-react";
import { APP_NAME, FEES, LIMITS, RATE_CARD, RATE_RANGE } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";
import { t } from "@/lib/i18n/en";
import { listJobs } from "@/lib/jobs";
import { JobCard } from "@/components/marketing/JobCard";
import { MarketingBottomNav } from "@/components/marketing/MarketingBottomNav";

const SERVICES = [
  { icon: PlaySquare, label: "YouTube subscribers" },
  { icon: Clock, label: "Watch time (hours)" },
  { icon: Eye, label: "Video views" },
  { icon: ThumbsUp, label: "Likes" },
  { icon: MessageCircle, label: "Comments" },
  { icon: Users, label: "FB / IG / TikTok follows" },
];

// Open jobs come from the database, so render at request time rather than
// prerendering at build (which would need a live DB and go stale).
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const jobs = (await listJobs()).slice(0, 6);

  return (
    <div className="bg-bg">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-fg">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-brand-fg">
              <Sparkles size={18} />
            </span>
            {APP_NAME}
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-fg-muted md:flex">
            <a href="#how" className="hover:text-fg">{t.marketing.navFeatures}</a>
            <a href="#jobs" className="hover:text-fg">{t.marketing.navJobs}</a>
            <a href="#pricing" className="hover:text-fg">{t.marketing.navPricing}</a>
            <a href="#faq" className="hover:text-fg">{t.marketing.navFaq}</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-fg hover:bg-bg-subtle"
            >
              {t.marketing.login}
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-brand-fg hover:bg-brand-600"
            >
              {t.marketing.getStarted}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-gradient relative overflow-hidden text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-300" />
              {t.marketing.heroKicker}
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              {t.marketing.heroTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/80 sm:text-lg lg:mx-0">
              {t.marketing.heroSub}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-brand-700 shadow-soft hover:bg-white/90"
              >
                <BadgeDollarSign size={18} /> {t.marketing.heroCtaWorker}
              </Link>
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20"
              >
                <Megaphone size={18} /> {t.marketing.heroCtaBuyer}
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/60">{t.marketing.trusted}</p>
          </div>

          {/* Success visual */}
          <HeroArt />
        </div>

        {/* Preview cards — white cards floating on the green band */}
        <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
            {[
              { icon: Wallet, label: "Worker earns", value: `${formatMoney(RATE_RANGE.min)}–${formatMoney(RATE_RANGE.max)}`, sub: "per action, by platform" },
              { icon: Megaphone, label: "Buyer pays", value: "The same", sub: "no platform markup" },
              { icon: ShieldCheck, label: "Min. withdrawal", value: formatMoney(LIMITS.minWithdraw), sub: `${FEES.withdrawFeePct}% fee` },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <c.icon size={18} className="text-brand" />
                <p className="mt-2 text-xs text-fg-muted">{c.label}</p>
                <p className="text-xl font-bold text-fg">{c.value}</p>
                <p className="text-[11px] text-fg-subtle">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="border-t border-border bg-bg-subtle/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-fg-muted">
            What you can grow
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SERVICES.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-3 py-5 text-center shadow-soft transition-colors hover:border-brand-200"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-500/15">
                  <s.icon size={18} />
                </span>
                <span className="text-xs font-medium leading-tight text-fg">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live jobs */}
      <section id="jobs" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-fg sm:text-3xl">
                Jobs you can do right now
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Real tasks from real buyers. Create a free worker account to claim one.
              </p>
            </div>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-700"
            >
              Browse all jobs <ArrowRight size={15} />
            </Link>
          </div>

          {jobs.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-2xl border border-dashed border-border-strong bg-card-muted px-6 py-12 text-center text-sm text-fg-muted">
              No open jobs at the moment — check back soon.
            </p>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-fg sm:text-3xl">
            {t.marketing.stepsTitle}
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Track
              title="For workers"
              color="brand"
              steps={[
                "Sign up free with your phone",
                "Pick a task — subscribe, watch a video, like or comment",
                "Subscribe / watch for the required time",
                "Submit a screenshot as proof",
                `Reward clears after a ${LIMITS.holdDaysDefault}-day hold`,
                "Withdraw to bKash / Nagad",
              ]}
            />
            <Track
              title="For buyers"
              color="ink"
              steps={[
                "Add funds via bKash / Nagad + TrxID",
                "Create a campaign: channel or video link + quantity",
                "Real viewers subscribe and watch your content",
                "Track subscribers and watch time live",
                "Only pay for verified actions",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-fg sm:text-3xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-fg-muted">
            No subscriptions. Every platform and action has its own rate — the
            buyer pays it and the worker earns it. Every balance, price and
            payout on TaskHub is in US dollars.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <PriceCard
              title="Workers"
              price={`from ${formatMoney(RATE_RANGE.min)} / task`}
              cta="Start earning"
              points={[
                "Free to join, no deposit",
                `Withdraw from ${formatMoney(LIMITS.minWithdraw)}`,
                `${FEES.withdrawFeePct}% withdrawal fee`,
                `${formatMoney(LIMITS.referralBonus)} referral bonus`,
              ]}
            />
            <PriceCard
              title="Buyers"
              price={`${formatMoney((RATE_CARD.youtube.subscribe ?? 0) * 1000)} / 1,000 subs`}
              highlight
              cta="Grow my channel"
              points={[
                "100% real, human subscribers & views",
                "Pay only for verified actions",
                `${LIMITS.holdDaysDefault}-day anti-drop verification`,
                "Live delivery tracking + proofs",
              ]}
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border bg-bg-subtle/40">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-fg sm:text-3xl">
            {t.marketing.faqTitle}
          </h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-border bg-card p-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-fg">
                  {f.q}
                  <span className="ml-3 text-fg-subtle transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm text-fg-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-center text-white sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">{t.marketing.ctaTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/90">
            {t.marketing.ctaSub}
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-brand-700 hover:bg-white/90"
          >
            {t.marketing.getStarted} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pb-20 md:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-fg-muted sm:flex-row sm:px-6">
          <p className="flex items-center gap-1.5">
            <Smartphone size={14} /> {t.marketing.footerNote}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/about" className="hover:text-fg">
              About
            </Link>
            <Link href="/contact" className="hover:text-fg">
              Contact
            </Link>
            <Link href="/terms" className="hover:text-fg">
              Terms
            </Link>
            <p>
              © {new Date().getFullYear()} {APP_NAME}
            </p>
          </div>
        </div>
      </footer>

      <MarketingBottomNav />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Hero success visual — a mock YouTube growth panel. Pure markup +
 * one inline SVG sparkline so it needs no image asset and stays on
 * the white / black / brand-green theme. Swap in a real screenshot at
 * /public/hero.png and replace this component if you prefer a photo.
 * ------------------------------------------------------------------ */
function HeroArt() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mr-0">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#FF0000]/10 text-[#FF0000]">
              <PlaySquare size={18} />
            </span>
            <div className="leading-tight">
              <p className="text-xs text-fg-muted">Your channel</p>
              <p className="text-sm font-semibold text-fg">Growing now</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
            <TrendingUp size={12} /> +18%
          </span>
        </div>

        <div className="mt-4">
          <p className="text-xs text-fg-muted">Subscribers</p>
          <p className="text-3xl font-bold tracking-tight text-fg tabular-nums">
            12,480
          </p>
        </div>

        <svg
          viewBox="0 0 320 88"
          preserveAspectRatio="none"
          className="mt-1 h-20 w-full"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 74 L40 66 L80 70 L120 52 L160 55 L200 38 L240 30 L280 18 L320 6 L320 88 L0 88 Z"
            fill="url(#heroSpark)"
          />
          <path
            d="M0 74 L40 66 L80 70 L120 52 L160 55 L200 38 L240 30 L280 18 L320 6"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="mt-3 rounded-xl border border-border bg-card-muted p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-fg">
              <Clock size={13} className="text-brand" /> Watch hours
            </span>
            <span className="tabular-nums text-fg-muted">3,210 / 4,000</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-subtle ring-1 ring-inset ring-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
              style={{ width: "80%" }}
            />
          </div>
        </div>
      </div>

      <div className="absolute -left-3 -bottom-4 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-card sm:flex">
        <CheckCircle2 size={16} className="text-brand" />
        <span className="text-xs font-medium text-fg">Verified by real viewers</span>
      </div>
      <div className="absolute -right-3 -top-4 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-card sm:flex">
        <Users size={16} className="text-brand" />
        <span className="text-xs font-medium text-fg">+248 today</span>
      </div>
    </div>
  );
}

function Track({
  title,
  steps,
  color,
}: {
  title: string;
  steps: string[];
  color: "brand" | "ink";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <p
        className={`text-sm font-bold ${
          color === "brand" ? "text-brand-700" : "text-fg"
        }`}
      >
        {title}
      </p>
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-fg">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                color === "brand"
                  ? "bg-brand-50 text-brand-700"
                  : "bg-fg text-bg"
              }`}
            >
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

function PriceCard({
  title,
  price,
  points,
  cta,
  highlight,
}: {
  title: string;
  price: string;
  points: string[];
  cta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "border-brand bg-card shadow-card"
          : "border-border bg-card shadow-soft"
      }`}
    >
      <p className="text-sm font-semibold text-fg-muted">{title}</p>
      <p className="mt-1 text-2xl font-bold text-fg">{price}</p>
      <ul className="mt-4 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex gap-2 text-sm text-fg">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" />
            {p}
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold ${
          highlight
            ? "bg-brand text-brand-fg hover:bg-brand-600"
            : "border border-border-strong bg-card text-fg hover:bg-bg-subtle"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

const FAQS = [
  {
    q: "Is this real? How do I get paid?",
    a: "Yes. Workers earn dollars for each verified task and withdraw once they reach the minimum balance.",
  },
  {
    q: "Do the subscribers and watch time count for monetization?",
    a: "Every action is done by a real, logged-in human who genuinely subscribes and watches. That is exactly what YouTube counts — but grow gradually and keep posting so it stays natural.",
  },
  {
    q: "Why is there a hold period on rewards?",
    a: `Rewards are held for ${LIMITS.holdDaysDefault} days so we can verify the subscribe / watch stuck. If a worker unsubscribes early, the reward is reversed and repeat offenders are banned.`,
  },
  {
    q: "Are the subscribers real people?",
    a: "Every subscribe, view and watch-hour is delivered by a real, logged-in human worker. No bots, no bought accounts.",
  },
  {
    q: "How do buyers add money?",
    a: "Send money to our bKash/Nagad number and submit the Transaction ID. An admin verifies it and your wallet is topped up.",
  },
];
