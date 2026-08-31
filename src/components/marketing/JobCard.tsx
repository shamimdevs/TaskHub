import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { PlatformChip } from "@/components/ui/StatusBadge";
import { formatMoney, relativeTime } from "@/lib/utils";
import type { Task } from "@/types";

export function JobCard({ job }: { job: Task }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <PlatformChip platform={job.platform} type={job.type} />
        <span className="shrink-0 text-right">
          <span className="block text-lg font-bold text-brand tabular-nums">
            {formatMoney(job.reward)}
          </span>
          <span className="block text-[11px] text-fg-subtle">per action</span>
        </span>
      </div>

      <h3 className="mt-3 text-sm font-semibold tracking-tight text-fg group-hover:text-brand-700">
        {job.title}
      </h3>
      <p className="mt-0.5 text-xs text-fg-muted">by {job.buyerName}</p>

      <div className="mt-4 flex items-center gap-4 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-1">
          <Users size={12} /> {job.slotsLeft.toLocaleString()} slots
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={12} /> {job.holdDays}-day hold
        </span>
        <span className="ml-auto text-fg-subtle">{relativeTime(job.postedAt)}</span>
      </div>
    </Link>
  );
}
