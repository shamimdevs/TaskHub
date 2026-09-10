"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Avatar } from "@/components/ui/Misc";
import { PlatformChip, SubmissionStatusBadge } from "@/components/ui/StatusBadge";
import { ReviewButtons } from "@/components/panels/admin/ReviewButtons";
import { useToast } from "@/components/ui/Toast";
import {
  useGetSubmissionsQuery,
  useReviewSubmissionMutation,
} from "@/redux/features/submissions/submissionsApi";
import { formatMoney, formatDate } from "@/lib/utils";
import type { Submission } from "@/types";

type Filter = "pending" | "held" | "all";

/** Complete, but the reward is still inside its hold window. */
const isHeld = (s: Submission) => s.status === "approved" && !s.releasedAt;

export default function AdminSubmissionsPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const query = useGetSubmissionsQuery({ status: "all" });
  const [review, { isLoading }] = useReviewSubmissionMutation();
  const toast = useToast();

  const all = query.data ?? [];
  const pending = all.filter((s) => s.status === "pending");
  const held = all.filter(isHeld);
  const list = filter === "pending" ? pending : filter === "held" ? held : all;

  const act = async (id: string, action: "reject" | "penalize") => {
    try {
      await review({ id, action }).unwrap();
      toast.success(action === "penalize" ? "Penalized & reversed" : "Rejected");
    } catch {
      toast.error("Action failed");
    }
  };

  return (
    <>
      <PageHeader
        title="Verification queue"
        description="Submissions are verified and completed automatically. Reject or penalize fake proofs here."
      />

      <Tabs<Filter>
        className="mb-4"
        value={filter}
        onChange={setFilter}
        items={[
          { value: "pending", label: "Pending", count: pending.length },
          { value: "held", label: "On hold", count: held.length },
          { value: "all", label: "All", count: all.length },
        ]}
      />

      <QueryBoundary
        query={{ ...query, data: list }}
        empty={{ title: "Queue is clear", description: "Nothing to verify right now." }}
      >
        {(rows) => (
          <div className="space-y-3">
            {rows.map((s) => (
              <Card key={s.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.workerName} size={34} />
                      <div>
                        <p className="text-sm font-semibold text-fg">
                          {s.workerName}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {formatDate(s.submittedAt)} · {formatMoney(s.reward)}
                        </p>
                      </div>
                    </div>
                    <SubmissionStatusBadge status={s.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <PlatformChip platform={s.platform} type={s.type} />
                    <span className="text-sm text-fg">{s.title}</span>
                  </div>

                  {s.proofUrl && (
                    <a
                      href={s.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                    >
                      {s.proofUrl} <ExternalLink size={12} />
                    </a>
                  )}
                  {s.proofNote && (
                    <p className="rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs text-fg-muted">
                      “{s.proofNote}”
                    </p>
                  )}

                  {(s.status === "pending" || isHeld(s)) && (
                    <ReviewButtons
                      loading={isLoading}
                      onReject={() => act(s.id, "reject")}
                    />
                  )}
                  {s.status === "approved" && (
                    <ReviewButtons
                      loading={isLoading}
                      onPenalize={() => act(s.id, "penalize")}
                    />
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
