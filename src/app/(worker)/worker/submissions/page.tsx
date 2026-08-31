"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { Tabs } from "@/components/ui/Tabs";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { LinkButton } from "@/components/ui/Button";
import { SubmissionCard } from "@/components/panels/worker/SubmissionCard";
import { useGetSubmissionsQuery } from "@/redux/features/submissions/submissionsApi";
import type { SubmissionStatus } from "@/types";

type Filter = "all" | SubmissionStatus;

export default function SubmissionsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const query = useGetSubmissionsQuery();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    query.data?.forEach((s) => (c[s.status] = (c[s.status] ?? 0) + 1));
    return c;
  }, [query.data]);

  const filtered = query.data?.filter(
    (s) => filter === "all" || s.status === filter,
  );

  return (
    <>
      <PageHeader
        title="My submissions"
        description="Track every task you've submitted"
      />

      <Tabs<Filter>
        className="mb-4"
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "All", count: query.data?.length },
          { value: "pending", label: "Pending", count: counts.pending },
          { value: "on_hold", label: "On hold", count: counts.on_hold },
          { value: "approved", label: "Approved", count: counts.approved },
          { value: "rejected", label: "Rejected", count: counts.rejected },
        ]}
      />

      <QueryBoundary
        query={{ ...query, data: filtered }}
        empty={{
          title: "Nothing here",
          description: "Submit a task and it will show up here.",
          action: <LinkButton href="/worker/tasks" size="sm">Browse tasks</LinkButton>,
        }}
      >
        {(list) => (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((s) => (
              <SubmissionCard key={s.id} sub={s} />
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
