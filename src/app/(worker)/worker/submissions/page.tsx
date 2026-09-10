"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { Button, LinkButton } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Pagination } from "@/components/ui/Pagination";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { SubmissionCard } from "@/components/panels/worker/SubmissionCard";
import { useGetSubmissionsQuery } from "@/redux/features/submissions/submissionsApi";
import { PLATFORMS } from "@/lib/constants";
import { dayKey, formatMoney } from "@/lib/utils";
import type { Platform, SubmissionStatus } from "@/types";

type StatusFilter = "all" | SubmissionStatus;

const PAGE_SIZE = 12;

export default function SubmissionsPage() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const query = useGetSubmissionsQuery();
  const all = useMemo(() => query.data ?? [], [query.data]);

  // Only offer platforms this worker has actually submitted on.
  const platformOptions = useMemo(
    () => [...new Set(all.map((s) => s.platform))],
    [all],
  );

  // Everything except the status tab, so the tab counts describe this range.
  const scoped = useMemo(
    () =>
      all.filter((s) => {
        if (platform !== "all" && s.platform !== platform) return false;
        const day = dayKey(s.submittedAt);
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      }),
    [all, platform, from, to],
  );

  const list = useMemo(
    () => (status === "all" ? scoped : scoped.filter((s) => s.status === status)),
    [scoped, status],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    scoped.forEach((s) => (c[s.status] = (c[s.status] ?? 0) + 1));
    return c;
  }, [scoped]);

  /** What this selection is worth — the number a worker actually wants. */
  const earned = useMemo(
    () =>
      list
        .filter((s) => s.status === "approved" || s.status === "on_hold")
        .reduce((n, s) => n + s.reward, 0),
    [list],
  );

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  // Clamped rather than reset in an effect, so narrowing the range never
  // leaves the view stranded on a page that no longer exists.
  const current = Math.min(page, pageCount);
  const rows = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  /** Any filter change starts over: page 3 of the old result set means nothing. */
  const onFilter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  /** Last `days` days, inclusive of today. `null` clears the range. */
  const preset = (days: number | null) => {
    if (days === null) {
      setFrom("");
      setTo("");
    } else {
      const start = new Date();
      start.setDate(start.getDate() - (days - 1));
      setFrom(dayKey(start));
      setTo(dayKey(new Date()));
    }
    setPage(1);
  };

  const resetAll = () => {
    setStatus("all");
    setPlatform("all");
    setFrom("");
    setTo("");
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="My submissions"
        description="Track every task you've submitted"
      />

      <Card className="mb-4">
        <CardBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Platform">
              <Select
                value={platform}
                onChange={(e) =>
                  onFilter(setPlatform)(e.target.value as Platform | "all")
                }
              >
                <option value="all">All platforms</option>
                {platformOptions.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORMS[p].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="From">
              <Input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => onFilter(setFrom)(e.target.value)}
              />
            </Field>
            <Field label="To">
              <Input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => onFilter(setTo)(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-fg-muted">Quick range</span>
            <Button size="sm" variant="ghost" onClick={() => preset(1)}>
              Today
            </Button>
            <Button size="sm" variant="ghost" onClick={() => preset(7)}>
              7 days
            </Button>
            <Button size="sm" variant="ghost" onClick={() => preset(30)}>
              30 days
            </Button>
            <Button size="sm" variant="ghost" onClick={() => preset(null)}>
              All time
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={RotateCcw}
              className="ml-auto"
              onClick={resetAll}
            >
              Reset
            </Button>
          </div>
        </CardBody>
      </Card>

      <Tabs<StatusFilter>
        className="mb-4"
        value={status}
        onChange={onFilter(setStatus)}
        items={[
          { value: "all", label: "All", count: scoped.length },
          { value: "pending", label: "Pending", count: counts.pending ?? 0 },
          { value: "on_hold", label: "On hold", count: counts.on_hold ?? 0 },
          { value: "approved", label: "Approved", count: counts.approved ?? 0 },
          { value: "rejected", label: "Rejected", count: counts.rejected ?? 0 },
        ]}
      />

      <QueryBoundary
        query={{ ...query, data: rows }}
        empty={{
          title: "Nothing here",
          description: all.length
            ? "No submission matches these filters."
            : "Submit a task and it will show up here.",
          action: <LinkButton href="/worker/tasks" size="sm">Browse tasks</LinkButton>,
        }}
      >
        {(visible) => (
          <div className="space-y-3">
            <p className="text-xs text-fg-muted">
              Showing {(current - 1) * PAGE_SIZE + 1}–
              {(current - 1) * PAGE_SIZE + visible.length} of {list.length}
              {earned > 0 && ` · ${formatMoney(earned)} earned or on hold`}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((s) => (
                <SubmissionCard key={s.id} sub={s} />
              ))}
            </div>

            <Pagination page={current} pageCount={pageCount} onPage={setPage} />
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
