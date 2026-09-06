"use client";

import { cn } from "@/lib/utils";

export interface Segment<T extends string> {
  value: T;
  label: React.ReactNode;
  hint?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  segments,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  segments: Segment<T>[];
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-grid w-full gap-1 rounded-xl border border-border bg-bg-subtle p-1",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}
    >
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s.value)}
            className={cn(
              "rounded-lg text-center font-medium transition-colors",
              size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
              active
                ? "bg-card text-fg shadow-soft"
                : "text-fg-muted hover:text-fg",
            )}
          >
            <span className="block">{s.label}</span>
            {s.hint && (
              <span
                className={cn(
                  "mt-0.5 block text-[11px] font-normal",
                  active ? "text-fg-muted" : "text-fg-subtle",
                )}
              >
                {s.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
