"use client";

import { useState } from "react";
import { Check, Copy, type LucideIcon } from "lucide-react";
import { cn, initials } from "@/lib/utils";

/* -------------------------------- Avatar -------------------------------- */
export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/* ------------------------------- Progress ------------------------------ */
export function Progress({
  value,
  className,
  tone = "brand",
}: {
  value: number;
  className?: string;
  tone?: "brand" | "accent" | "warning";
}) {
  const c =
    tone === "warning"
      ? "bg-warning"
      : "bg-gradient-to-r from-brand-600 to-brand-400";
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-bg-subtle ring-1 ring-inset ring-border",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", c)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ------------------------------- Skeleton ----------------------------- */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-bg-subtle",
        className,
      )}
    />
  );
}

/* -------------------------------- Spinner ---------------------------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-border-strong border-t-brand",
        className,
      )}
    />
  );
}

/* ------------------------------ EmptyState -------------------------- */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-card-muted px-6 py-14 text-center">
      {Icon && (
        <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-500/15">
          <Icon size={22} />
        </span>
      )}
      <p className="text-sm font-semibold tracking-tight text-fg">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-fg-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* -------------------------------- Alert ---------------------------- */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-info/25 bg-info-soft text-info",
    success: "border-success/25 bg-success-soft text-success",
    warning: "border-warning/25 bg-warning-soft text-warning",
    danger: "border-danger/25 bg-danger-soft text-danger",
  } as const;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border py-3 pl-4 pr-3.5 text-sm",
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-current before:opacity-70",
        tones[tone],
        className,
      )}
    >
      {title && <p className="font-semibold tracking-tight">{title}</p>}
      {children && (
        <div className={cn(title && "mt-0.5", "text-fg/75")}>{children}</div>
      )}
    </div>
  );
}

/* ------------------------------ CopyButton ------------------------ */
export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-card px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-bg-subtle",
        className,
      )}
    >
      {done ? <Check size={13} className="text-success" /> : <Copy size={13} />}
      {done ? "Copied" : label}
    </button>
  );
}
