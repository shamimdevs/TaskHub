"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Progress } from "@/components/ui/Misc";
import { CampaignStatusBadge, PlatformChip } from "@/components/ui/StatusBadge";
import { ReviewButtons } from "@/components/panels/admin/ReviewButtons";
import { useToast } from "@/components/ui/Toast";
import {
  useGetCampaignsQuery,
  useUpdateCampaignMutation,
} from "@/redux/features/campaigns/campaignsApi";
import { formatMoney, formatNumber, pct } from "@/lib/utils";

type Filter = "pending_review" | "active" | "all";

export default function AdminCampaignsPage() {
  const [filter, setFilter] = useState<Filter>("pending_review");
  const query = useGetCampaignsQuery({ scope: "all" });
  const [update, { isLoading }] = useUpdateCampaignMutation();
  const toast = useToast();

  const list = (query.data ?? []).filter((c) =>
    filter === "all" ? true : c.status === filter,
  );
  const count = (s: string) =>
    (query.data ?? []).filter((c) => c.status === s).length;

  const act = async (id: string, status: "active" | "rejected") => {
    try {
      await update({ id, status }).unwrap();
      toast.success(status === "active" ? "Campaign approved" : "Campaign rejected");
    } catch {
      toast.error("Action failed");
    }
  };

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Review new campaigns before they reach workers"
      />

      <Tabs<Filter>
        className="mb-4"
        value={filter}
        onChange={setFilter}
        items={[
          {
            value: "pending_review",
            label: "Awaiting review",
            count: count("pending_review"),
          },
          { value: "active", label: "Active", count: count("active") },
          { value: "all", label: "All", count: query.data?.length },
        ]}
      />

      <QueryBoundary
        query={{ ...query, data: list }}
        empty={{ title: "Nothing here" }}
      >
        {(rows) => (
          <div className="space-y-3">
            {rows.map((c) => (
              <Card key={c.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <PlatformChip platform={c.platform} type={c.type} />
                      <Link
                        href={`/buyer/campaigns/${c.id}`}
                        className="mt-1.5 block truncate text-sm font-semibold text-fg hover:text-brand"
                      >
                        {c.title}
                      </Link>
                      <p className="truncate text-xs text-fg-muted">
                        by {c.buyerName} · {c.targetUrl}
                      </p>
                    </div>
                    <CampaignStatusBadge status={c.status} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-fg-subtle">Quantity</p>
                      <p className="font-medium text-fg">
                        {formatNumber(c.quantity)}
                      </p>
                    </div>
                    <div>
                      <p className="text-fg-subtle">Budget</p>
                      <p className="font-medium text-fg">
                        {formatMoney(c.totalCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-fg-subtle">Delivered</p>
                      <p className="font-medium text-fg">
                        {pct(c.delivered, c.quantity)}%
                      </p>
                    </div>
                  </div>
                  <Progress value={pct(c.delivered, c.quantity)} />

                  {c.status === "pending_review" && (
                    <ReviewButtons
                      loading={isLoading}
                      approveLabel="Approve & publish"
                      onApprove={() => act(c.id, "active")}
                      onReject={() => act(c.id, "rejected")}
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
