"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-border-strong bg-card px-3 text-sm font-medium text-fg disabled:opacity-40"
      >
        <ChevronLeft size={15} /> Prev
      </button>
      <span className="text-sm text-fg-muted">
        Page <span className="font-semibold text-fg">{page}</span> / {pageCount}
      </span>
      <button
        onClick={() => onPage(Math.min(pageCount, page + 1))}
        disabled={page >= pageCount}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-lg border border-border-strong bg-card px-3 text-sm font-medium text-fg disabled:opacity-40",
        )}
      >
        Next <ChevronRight size={15} />
      </button>
    </div>
  );
}
