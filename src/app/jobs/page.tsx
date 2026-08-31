import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { JobCard } from "@/components/marketing/JobCard";
import { listJobs, jobPlatforms } from "@/lib/jobs";
import { APP_NAME, PLATFORMS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Jobs",
  description: `Open micro-tasks you can complete for cash on ${APP_NAME}.`,
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const { platform = "all" } = await searchParams;
  const jobs = listJobs(platform);
  const available = jobPlatforms();

  const filters = [
    { value: "all", label: "All" },
    ...available.map((p) => ({ value: p, label: PLATFORMS[p].label })),
  ];

  return (
    <MarketingShell size="wide">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">
        Jobs
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
        Open jobs
      </h1>
      <p className="mt-4 text-base leading-relaxed text-fg-muted">
        Pick a task, complete it from your own account, and submit a screenshot
        as proof. Rewards are paid per verified action.{" "}
        <Link
          href="/register"
          className="font-medium text-brand underline underline-offset-2"
        >
          Create a free worker account
        </Link>{" "}
        to claim one.
      </p>

      {/* Platform filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = f.value === platform || (f.value === "all" && platform === "all");
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/jobs" : `/jobs?platform=${f.value}`}
              className={
                active
                  ? "rounded-full border border-brand bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-fg"
                  : "rounded-full border border-border-strong bg-card px-3.5 py-1.5 text-xs font-semibold text-fg-muted hover:border-brand-300 hover:text-fg"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-fg-muted">
        <ListChecks size={13} />
        {jobs.length} open job{jobs.length === 1 ? "" : "s"}
        {platform !== "all" && ` on ${PLATFORMS[platform as keyof typeof PLATFORMS]?.label ?? platform}`}
      </p>

      {jobs.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border-strong bg-card-muted px-6 py-14 text-center">
          <p className="text-sm font-semibold text-fg">No open jobs here</p>
          <p className="mt-1 text-sm text-fg-muted">
            Try another platform or check back later.
          </p>
          <Link
            href="/jobs"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-border-strong bg-card px-4 text-sm font-semibold text-fg hover:bg-bg-subtle"
          >
            Clear filter
          </Link>
        </div>
      )}
    </MarketingShell>
  );
}
