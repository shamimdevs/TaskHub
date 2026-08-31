"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Select } from "@/components/ui/Input";
import { TaskCard } from "@/components/panels/worker/TaskCard";
import { useGetTasksQuery } from "@/redux/features/tasks/tasksApi";
import { PLATFORMS, TASK_TYPES } from "@/lib/constants";

export default function AvailableTasksPage() {
  const [platform, setPlatform] = useState("all");
  const [type, setType] = useState("all");
  const query = useGetTasksQuery({ platform, type });

  return (
    <>
      <PageHeader
        title="Available tasks"
        description="Pick a task, complete it, submit proof"
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:max-w-md">
        <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="all">All platforms</option>
          {Object.entries(PLATFORMS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All actions</option>
          {Object.entries(TASK_TYPES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
      </div>

      <QueryBoundary
        query={query}
        empty={{
          title: "No matching tasks",
          description: "Try clearing the filters or check back later.",
        }}
      >
        {(list) => (
          <>
            <p className="mb-3 text-xs text-fg-muted">
              <ListChecks size={13} className="mr-1 inline" />
              {list.length} task{list.length === 1 ? "" : "s"} available
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
