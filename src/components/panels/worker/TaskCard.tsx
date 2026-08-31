import Link from "next/link";
import { ArrowRight, Clock, Users } from "lucide-react";
import type { Task } from "@/types";
import { TASK_TYPES } from "@/lib/constants";
import { formatMoney, relativeTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { PlatformChip } from "@/components/ui/StatusBadge";

export function TaskCard({ task }: { task: Task }) {
  return (
    <Card interactive className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <PlatformChip platform={task.platform} type={task.type} />
          <h3 className="mt-2 truncate text-sm font-semibold text-fg">
            {task.title}
          </h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            {TASK_TYPES[task.type].verb} · by {task.buyerName}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-brand">
            {formatMoney(task.reward)}
          </p>
          <p className="text-[11px] text-fg-subtle">reward</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-fg-muted">
        <span className="inline-flex items-center gap-1">
          <Users size={12} /> {task.slotsLeft.toLocaleString()} slots
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={12} /> {relativeTime(task.postedAt)}
        </span>
        <span className="rounded bg-bg-subtle px-1.5 py-0.5">
          {task.holdDays}-day hold
        </span>
      </div>

      <Link
        href={`/worker/tasks/${task.id}`}
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-brand text-sm font-semibold text-brand-fg hover:bg-brand-600"
      >
        Do this task <ArrowRight size={15} />
      </Link>
    </Card>
  );
}
