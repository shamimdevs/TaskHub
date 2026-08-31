"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Avatar } from "@/components/ui/Misc";
import { PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { ReviewButtons } from "@/components/panels/admin/ReviewButtons";
import { useToast } from "@/components/ui/Toast";
import {
  useGetWithdrawalsQuery,
  useReviewWithdrawalMutation,
} from "@/redux/features/withdrawals/withdrawalsApi";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatMoney, formatDateTime } from "@/lib/utils";

type Filter = "pending" | "approved" | "paid" | "all";

export default function AdminWithdrawalsPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const query = useGetWithdrawalsQuery({ scope: "all" });
  const [review, { isLoading }] = useReviewWithdrawalMutation();
  const toast = useToast();

  const list = (query.data ?? []).filter((w) =>
    filter === "all" ? true : w.status === filter,
  );
  const count = (s: string) =>
    (query.data ?? []).filter((w) => w.status === s).length;

  const act = async (id: string, action: "approve" | "reject" | "markPaid") => {
    try {
      await review({ id, action }).unwrap();
      toast.success(
        action === "markPaid"
          ? "Marked as paid"
          : action === "approve"
            ? "Approved"
            : "Rejected",
      );
    } catch {
      toast.error("Action failed");
    }
  };

  return (
    <>
      <PageHeader
        title="Withdrawals"
        description="Approve payout requests and mark them paid after sending"
      />

      <Tabs<Filter>
        className="mb-4"
        value={filter}
        onChange={setFilter}
        items={[
          { value: "pending", label: "Pending", count: count("pending") },
          { value: "approved", label: "Approved", count: count("approved") },
          { value: "paid", label: "Paid", count: count("paid") },
          { value: "all", label: "All", count: query.data?.length },
        ]}
      />

      <QueryBoundary
        query={{ ...query, data: list }}
        empty={{ title: "Nothing to review" }}
      >
        {(rows) => (
          <div className="space-y-3">
            {rows.map((w) => (
              <Card key={w.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={w.workerName} size={34} />
                      <div>
                        <p className="text-sm font-semibold text-fg">
                          {w.workerName}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {formatDateTime(w.createdAt)}
                        </p>
                      </div>
                    </div>
                    <PaymentStatusBadge status={w.status} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-bg-subtle p-2.5 text-xs">
                    <Meta label="Requested">{formatMoney(w.amount)}</Meta>
                    <Meta label="Fee">− {formatMoney(w.fee)}</Meta>
                    <Meta label="Net payout">
                      <span className="font-bold text-fg">{formatMoney(w.net)}</span>
                    </Meta>
                    <Meta label="Method">
                      <Badge tone="neutral">
                        {PAYMENT_METHODS[w.method].label}
                      </Badge>
                    </Meta>
                    <Meta label="Account">{w.accountNumber}</Meta>
                  </div>

                  {w.status === "pending" && (
                    <ReviewButtons
                      loading={isLoading}
                      onApprove={() => act(w.id, "approve")}
                      onReject={() => act(w.id, "reject")}
                    />
                  )}
                  {w.status === "approved" && (
                    <ReviewButtons
                      loading={isLoading}
                      onMarkPaid={() => act(w.id, "markPaid")}
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

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-fg-subtle">{label}</p>
      <div className="mt-0.5 font-medium text-fg">{children}</div>
    </div>
  );
}
