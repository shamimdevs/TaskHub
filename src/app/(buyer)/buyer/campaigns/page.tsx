"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Tabs } from "@/components/ui/Tabs";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { LinkButton } from "@/components/ui/Button";
import { CampaignCard } from "@/components/panels/buyer/CampaignCard";
import { useGetCampaignsQuery } from "@/redux/features/campaigns/campaignsApi";

type Filter = "all" | "active" | "pending_review" | "paused" | "completed";

export default function BuyerCampaignsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const query = useGetCampaignsQuery();

  const list = query.data ?? [];
  const filtered = list.filter((c) => filter === "all" || c.status === filter);
  const count = (s: Filter) =>
    s === "all" ? list.length : list.filter((c) => c.status === s).length;

  return (
    <>
      <PageHeader
        title="Campaigns"
        action={
          <LinkButton href="/buyer/campaigns/new" size="sm" icon={PlusCircle}>
            New
          </LinkButton>
        }
      />

      <Tabs<Filter>
        className="mb-4"
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "All", count: count("all") },
          { value: "active", label: "Active", count: count("active") },
          { value: "pending_review", label: "In review", count: count("pending_review") },
          { value: "paused", label: "Paused", count: count("paused") },
          { value: "completed", label: "Completed", count: count("completed") },
        ]}
      />

      <QueryBoundary
        query={{ ...query, data: filtered }}
        empty={{ title: "No campaigns here" }}
      >
        {(cs) => (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cs.map((c) => (
              <CampaignCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
