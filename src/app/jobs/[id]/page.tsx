import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ShieldAlert, Users } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PlatformChip } from "@/components/ui/StatusBadge";
import { getJob } from "@/lib/jobs";
import { APP_NAME, LIMITS, TASK_TYPES } from "@/lib/constants";
import { formatMoney, formatDate, relativeTime } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = getJob(id);
  return {
    title: job ? job.title : "Job not found",
    description: job
      ? `${TASK_TYPES[job.type].label} task on ${job.platform} — earn ${formatMoney(job.reward)} per verified action.`
      : undefined,
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) notFound();

  const facts = [
    { label: "Reward", value: formatMoney(job.reward), strong: true },
    { label: "Action", value: TASK_TYPES[job.type].label },
    { label: "Slots left", value: job.slotsLeft.toLocaleString() },
    { label: "Verification hold", value: `${job.holdDays} days` },
    { label: "Posted", value: relativeTime(job.postedAt) },
    ...(job.expiresAt
      ? [{ label: "Expires", value: formatDate(job.expiresAt) }]
      : []),
  ];

  return (
    <MarketingShell>
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={15} /> All jobs
      </Link>

      {/* Header */}
      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <PlatformChip platform={job.platform} type={job.type} />
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            {job.title}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">by {job.buyerName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold text-brand tabular-nums">
            {formatMoney(job.reward)}
          </p>
          <p className="text-[11px] text-fg-subtle">per action</p>
        </div>
      </div>

      {/* Quick facts */}
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {facts.map((f) => (
          <div
            key={f.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <dt className="text-xs text-fg-muted">{f.label}</dt>
            <dd
              className={
                f.strong
                  ? "mt-1 text-lg font-bold text-brand tabular-nums"
                  : "mt-1 text-sm font-semibold text-fg"
              }
            >
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Instructions */}
      <section className="mt-8">
        <h2 className="text-lg font-bold tracking-tight text-fg">
          What you&rsquo;ll do
        </h2>
        <ol className="mt-3 space-y-2.5">
          {job.instructions.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-fg-muted">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700 ring-1 ring-inset ring-brand-500/15">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-fg-subtle">
          The exact target link is shown once you claim the job from your worker
          dashboard.
        </p>
      </section>

      {/* Hold notice */}
      <div className="relative mt-8 overflow-hidden rounded-xl border border-warning/25 bg-warning-soft py-3 pl-4 pr-3.5 text-sm text-warning before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-current before:opacity-70">
        <p className="flex items-center gap-2 font-semibold tracking-tight">
          <ShieldAlert size={15} /> Reward held for {job.holdDays} days
        </p>
        <p className="mt-0.5 text-fg/75">
          The action must stay live through the {LIMITS.holdDaysRange[0]}&ndash;
          {LIMITS.holdDaysRange[1]} day hold. Undoing it early (unsubscribe,
          unfollow, delete) reverses the reward and repeat offences ban the
          account.
        </p>
      </div>

      {/* CTA */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
        <p className="text-base font-semibold text-fg">
          Claim this job and earn {formatMoney(job.reward)}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
          Create a free {APP_NAME} worker account — it takes under a minute — then
          claim this task and submit your proof.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-fg hover:bg-brand-600"
          >
            Sign up to claim
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border-strong bg-card px-5 text-sm font-semibold text-fg hover:bg-bg-subtle"
          >
            I already have an account
          </Link>
        </div>
      </div>

      {/* Slots hint */}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-fg-muted">
        <Users size={13} /> {job.slotsLeft.toLocaleString()} slots left
        <span className="mx-1">·</span>
        <Clock size={13} /> posted {relativeTime(job.postedAt)}
      </p>
    </MarketingShell>
  );
}
