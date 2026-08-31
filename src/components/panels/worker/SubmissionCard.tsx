import { CalendarClock, ExternalLink } from "lucide-react";
import type { Submission } from "@/types";
import { formatMoney, formatDate, relativeTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { PlatformChip, SubmissionStatusBadge } from "@/components/ui/StatusBadge";

export function SubmissionCard({ sub }: { sub: Submission }) {
  const onHold = sub.status === "on_hold";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <PlatformChip platform={sub.platform} type={sub.type} />
          <h3 className="mt-2 truncate text-sm font-semibold text-fg">
            {sub.title}
          </h3>
        </div>
        <SubmissionStatusBadge status={sub.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
        <span>Submitted {relativeTime(sub.submittedAt)}</span>
        <span className="font-semibold text-fg">{formatMoney(sub.reward)}</span>
      </div>

      {onHold && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-info-soft px-2 py-1 text-[11px] font-medium text-info">
          <CalendarClock size={12} /> Releases {formatDate(sub.holdUntil)}
        </p>
      )}
      {sub.status === "rejected" && sub.reviewerNote && (
        <p className="mt-2 rounded-md bg-danger-soft px-2 py-1 text-[11px] text-danger">
          {sub.reviewerNote}
        </p>
      )}
      {sub.proofUrl && (
        <a
          href={sub.proofUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          View proof <ExternalLink size={12} />
        </a>
      )}
    </Card>
  );
}
