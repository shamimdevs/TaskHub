"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Avatar, CopyButton } from "@/components/ui/Misc";
import { PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { ReviewButtons } from "@/components/panels/admin/ReviewButtons";
import { useToast } from "@/components/ui/Toast";
import {
  useGetDepositsQuery,
  useReviewDepositMutation,
} from "@/redux/features/deposits/depositsApi";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatBdt, formatMoney, formatDateTime } from "@/lib/utils";

type Filter = "pending" | "approved" | "rejected" | "all";

export default function AdminDepositsPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const query = useGetDepositsQuery({ scope: "all" });
  const [review, { isLoading }] = useReviewDepositMutation();
  const toast = useToast();

  const list = (query.data ?? []).filter((d) =>
    filter === "all" ? true : d.status === filter,
  );
  const count = (s: string) =>
    (query.data ?? []).filter((d) => d.status === s).length;

  const act = async (id: string, action: "approve" | "reject") => {
    try {
      await review({ id, action }).unwrap();
      toast.success(action === "approve" ? "Deposit approved" : "Deposit rejected");
    } catch {
      toast.error("Action failed");
    }
  };

  return (
    <>
      <PageHeader
        title="Deposits"
        description="Verify manual bKash / Nagad top-ups by TrxID"
      />

      <Tabs<Filter>
        className="mb-4"
        value={filter}
        onChange={setFilter}
        items={[
          { value: "pending", label: "Pending", count: count("pending") },
          { value: "approved", label: "Approved", count: count("approved") },
          { value: "rejected", label: "Rejected", count: count("rejected") },
          { value: "all", label: "All", count: query.data?.length },
        ]}
      />

      <QueryBoundary
        query={{ ...query, data: list }}
        empty={{ title: "Nothing to review" }}
      >
        {(rows) => (
          <div className="space-y-3">
            {rows.map((d) => (
              <Card key={d.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={d.buyerName} size={34} />
                      <div>
                        <p className="text-sm font-semibold text-fg">
                          {d.buyerName}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {formatDateTime(d.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-fg">
                        {formatBdt(d.amountBdt)}
                      </p>
                      <p className="text-[11px] text-fg-muted">
                        credits {formatMoney(d.amount)} @ ৳{d.usdRate}
                      </p>
                      <PaymentStatusBadge status={d.status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-bg-subtle p-2.5 text-xs">
                    <Meta label="Method">
                      <Badge tone="neutral">
                        {PAYMENT_METHODS[d.method].label}
                      </Badge>
                    </Meta>
                    <Meta label="Sender">{d.senderNumber}</Meta>
                    <Meta label="TrxID">
                      <span className="flex items-center gap-1.5">
                        <code className="font-semibold text-fg">{d.trxId}</code>
                        <CopyButton value={d.trxId} label="" />
                      </span>
                    </Meta>
                    {d.note && <Meta label="Note">{d.note}</Meta>}
                  </div>

                  {d.status === "pending" && (
                    <ReviewButtons
                      loading={isLoading}
                      onApprove={() => act(d.id, "approve")}
                      onReject={() => act(d.id, "reject")}
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
