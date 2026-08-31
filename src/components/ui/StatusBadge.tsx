import {
  CAMPAIGN_STATUS,
  PAYMENT_STATUS,
  PLATFORMS,
  SUBMISSION_STATUS,
  TASK_TYPES,
} from "@/lib/constants";
import type {
  CampaignStatus,
  PaymentStatus,
  Platform,
  SubmissionStatus,
  TaskType,
} from "@/types";
import { Badge } from "./Badge";
import { cn } from "@/lib/utils";

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const s = CAMPAIGN_STATUS[status];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const s = SUBMISSION_STATUS[status];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const s = PAYMENT_STATUS[status];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function UserStatusBadge({
  status,
}: {
  status: "active" | "banned" | "restricted";
}) {
  return (
    <Badge tone={status === "active" ? "success" : status === "banned" ? "danger" : "warning"} dot>
      {status[0].toUpperCase() + status.slice(1)}
    </Badge>
  );
}

/** Small coloured platform chip with the platform name. */
export function PlatformChip({
  platform,
  type,
  className,
}: {
  platform: Platform;
  type?: TaskType;
  className?: string;
}) {
  const p = PLATFORMS[platform];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{ backgroundColor: `${p.color}1a`, color: p.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
      {p.label}
      {type && <span className="opacity-70">· {TASK_TYPES[type].label}</span>}
    </span>
  );
}
