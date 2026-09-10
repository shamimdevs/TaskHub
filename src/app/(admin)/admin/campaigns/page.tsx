"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RotateCcw, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Pagination } from "@/components/ui/Pagination";
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
import { AUDIENCE_NOUN, CAMPAIGN_STATUS, PLATFORMS, TASK_TYPES } from "@/lib/constants";
import type { Campaign, CampaignStatus, Platform, TaskType } from "@/types";

type StatusFilter = CampaignStatus | "all";

const PAGE_SIZE = 10;

/** Status tabs, in the order an admin works through them. */
const STATUS_TABS: CampaignStatus[] = [
  "pending_review",
  "active",
  "paused",
  "completed",
  "rejected",
];

export default function AdminCampaignsPage() {
  const [status, setStatus] = useState<StatusFilter>("pending_review");
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [type, setType] = useState<TaskType | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const query = useGetCampaignsQuery({ scope: "all" });
  const [update, { isLoading }] = useUpdateCampaignMutation();
  const toast = useToast();

  const all = useMemo(() => query.data ?? [], [query.data]);

  // Only offer a platform or action that some campaign actually uses — the
  // rate card changes over time, and old campaigns keep their retired action.
  const platformOptions = useMemo(
    () => [...new Set(all.map((c) => c.platform))],
    [all],
  );
  const typeOptions = useMemo(() => [...new Set(all.map((c) => c.type))], [all]);

  // Everything except the status tab, so the tab counts describe this search.
  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((c) => {
      if (platform !== "all" && c.platform !== platform) return false;
      if (type !== "all" && c.type !== type) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.buyerName.toLowerCase().includes(q) ||
        c.targetUrl.toLowerCase().includes(q)
      );
    });
  }, [all, platform, type, search]);

  const list = useMemo(
    () => (status === "all" ? scoped : scoped.filter((c) => c.status === status)),
    [scoped, status],
  );

  const count = (s: CampaignStatus) =>
    scoped.filter((c) => c.status === s).length;

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  // Clamped rather than reset in an effect, so narrowing the search never
  // leaves the view stranded on a page that no longer exists.
  const current = Math.min(page, pageCount);
  const rows = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  /** Any filter change starts over: page 3 of the old result set means nothing. */
  const onFilter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const resetAll = () => {
    setStatus("pending_review");
    setPlatform("all");
    setType("all");
    setSearch("");
    setPage(1);
  };

  const act = async (id: string, next: "active" | "rejected") => {
    try {
      await update({ id, status: next }).unwrap();
      toast.success(next === "active" ? "Campaign approved" : "Campaign rejected");
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

      <Card className="mb-4">
        <CardBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Search" className="sm:col-span-2 lg:col-span-1">
              <Input
                icon={Search}
                placeholder="Title, buyer or target link"
                value={search}
                onChange={(e) => onFilter(setSearch)(e.target.value)}
              />
            </Field>
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
            <Field label="Action">
              <Select
                value={type}
                onChange={(e) =>
                  onFilter(setType)(e.target.value as TaskType | "all")
                }
              >
                <option value="all">All actions</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {TASK_TYPES[t].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-fg-muted">
              {list.length} campaign{list.length === 1 ? "" : "s"} match
              {list.length === 1 ? "es" : ""} these filters
            </p>
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={resetAll}>
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
          ...STATUS_TABS.map((s) => ({
            value: s as StatusFilter,
            label:
              s === "pending_review" ? "Awaiting review" : CAMPAIGN_STATUS[s].label,
            count: count(s),
          })),
          { value: "all", label: "All", count: scoped.length },
        ]}
      />

      <QueryBoundary
        query={{ ...query, data: rows }}
        empty={{
          title: "Nothing here",
          description: "No campaign matches these filters.",
        }}
      >
        {(visible) => (
          <div className="space-y-3">
            <p className="text-xs text-fg-muted">
              Showing {(current - 1) * PAGE_SIZE + 1}–
              {(current - 1) * PAGE_SIZE + visible.length} of {list.length}
            </p>

            {visible.map((c) => (
              <CampaignRow
                key={c.id}
                c={c}
                busy={isLoading}
                onApprove={() => act(c.id, "active")}
                onReject={() => act(c.id, "rejected")}
              />
            ))}

            <Pagination page={current} pageCount={pageCount} onPage={setPage} />
          </div>
        )}
      </QueryBoundary>
    </>
  );
}

function CampaignRow({
  c,
  busy,
  onApprove,
  onReject,
}: {
  c: Campaign;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card>
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
            {/* What the target was already sitting at when the campaign was
                created. The only number a proof can honestly be weighed
                against. */}
            {c.baselineFollowers != null && (
              <p className="truncate text-xs text-fg-subtle">
                Target had {formatNumber(c.baselineFollowers)}{" "}
                {AUDIENCE_NOUN[c.platform]} at launch
              </p>
            )}
          </div>
          <CampaignStatusBadge status={c.status} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-fg-subtle">Quantity</p>
            <p className="font-medium text-fg">{formatNumber(c.quantity)}</p>
          </div>
          <div>
            <p className="text-fg-subtle">Budget</p>
            <p className="font-medium text-fg">{formatMoney(c.totalCost)}</p>
          </div>
          <div>
            <p className="text-fg-subtle">Delivered</p>
            <p className="font-medium text-fg">{pct(c.delivered, c.quantity)}%</p>
          </div>
        </div>
        <Progress value={pct(c.delivered, c.quantity)} />

        {c.status === "pending_review" && (
          <ReviewButtons
            loading={busy}
            approveLabel="Approve & publish"
            onApprove={onApprove}
            onReject={onReject}
          />
        )}
      </CardBody>
    </Card>
  );
}
