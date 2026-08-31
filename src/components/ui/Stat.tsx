import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  tone = "brand",
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  /** Signed percentage / delta shown as a coloured pill, e.g. 12.5 or -3. */
  trend?: number;
  tone?: "brand" | "accent" | "warning" | "danger" | "neutral";
  className?: string;
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700 ring-brand-500/15",
    accent: "bg-brand-50 text-brand-700 ring-brand-500/15",
    warning: "bg-warning-soft text-warning ring-warning/15",
    danger: "bg-danger-soft text-danger ring-danger/15",
    neutral: "bg-bg-subtle text-fg-muted ring-border",
  } as const;

  const up = typeof trend === "number" && trend >= 0;

  return (
    <Card className={cn("p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-fg-muted">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset",
              tones[tone],
            )}
          >
            <Icon size={16} />
          </span>
        )}
      </div>

      <p className="mt-2.5 text-2xl font-bold tracking-tight text-fg tabular-nums sm:text-[1.75rem]">
        {value}
      </p>

      {(hint || typeof trend === "number") && (
        <div className="mt-1.5 flex items-center gap-2">
          {typeof trend === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums",
                up ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
              )}
            >
              {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trend)}%
            </span>
          )}
          {hint && <span className="text-xs text-fg-muted">{hint}</span>}
        </div>
      )}
    </Card>
  );
}

export function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="mt-0.5 font-semibold text-fg">{value}</p>
    </div>
  );
}
