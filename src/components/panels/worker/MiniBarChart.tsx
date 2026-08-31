import { cn } from "@/lib/utils";

/** Lightweight inline bar chart — no charting dependency. */
export function MiniBarChart({
  data,
  className,
  height = 120,
}: {
  data: { label: string; value: number }[];
  className?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("flex items-end gap-1.5", className)} style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-brand/80 transition-all"
            style={{ height: `${(d.value / max) * (height - 22)}px` }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[9px] text-fg-subtle">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
