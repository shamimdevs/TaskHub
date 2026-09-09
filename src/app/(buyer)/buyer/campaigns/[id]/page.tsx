"use client";

import { use } from "react";
import { Pause, Play, X } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Misc";
import { Stat } from "@/components/ui/Stat";
import { CampaignStatusBadge, PlatformChip } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  useGetCampaignQuery,
  useUpdateCampaignMutation,
} from "@/redux/features/campaigns/campaignsApi";
import { useGetSubmissionsQuery } from "@/redux/features/submissions/submissionsApi";
import { formatMoney, formatDate, formatNumber, pct } from "@/lib/utils";
import { AUDIENCE_NOUN } from "@/lib/constants";
import { t } from "@/lib/i18n/en";

export default function CampaignDetailPage({
  params,
}: PageProps<"/buyer/campaigns/[id]">) {
  const { id } = use(params);
  const query = useGetCampaignQuery(id);
  const subs = useGetSubmissionsQuery();
  const [update, { isLoading }] = useUpdateCampaignMutation();
  const toast = useToast();

  const proofs = (subs.data ?? []).filter((s) => s.campaignId === id);

  const setStatus = async (status: "active" | "paused" | "cancelled") => {
    try {
      await update({ id, status }).unwrap();
      toast.success(`Campaign ${status}`);
    } catch {
      toast.error(t.common.somethingWrong);
    }
  };

  return (
    <>
      <PageHeader
        title="Campaign"
        back={{ href: "/buyer/campaigns", label: "Campaigns" }}
      />

      <QueryBoundary query={query} isEmpty={() => false}>
        {(c) => {
          const progress = pct(c.delivered, c.quantity);
          return (
            <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
              <div className="space-y-4">
                <Card>
                  <CardBody>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <PlatformChip platform={c.platform} type={c.type} />
                        <h2 className="mt-2 text-base font-semibold text-fg">
                          {c.title}
                        </h2>
                        <a
                          href={c.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand hover:underline"
                        >
                          {c.targetUrl}
                        </a>
                        {/* The reading taken when the campaign was created —
                            what delivery is measured from. */}
                        {c.baselineFollowers != null && (
                          <p className="mt-1 text-xs text-fg-subtle">
                            {formatNumber(c.baselineFollowers)}{" "}
                            {AUDIENCE_NOUN[c.platform]} at launch
                          </p>
                        )}
                      </div>
                      <CampaignStatusBadge status={c.status} />
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-fg-muted">
                        <span>
                          {formatNumber(c.delivered)} / {formatNumber(c.quantity)}
                        </span>
                        <span className="font-semibold text-fg">{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <Stat label="Rate / action" value={formatMoney(c.ratePerAction)} />
                      <Stat label="Total budget" value={formatMoney(c.totalCost)} />
                      <Stat label="Hold" value={`${c.holdDays} days`} />
                    </div>

                    {c.note && (
                      <p className="mt-4 rounded-lg bg-bg-subtle p-3 text-sm text-fg-muted">
                        {c.note}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {c.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Pause}
                          loading={isLoading}
                          onClick={() => setStatus("paused")}
                        >
                          Pause
                        </Button>
                      )}
                      {c.status === "paused" && (
                        <Button
                          size="sm"
                          icon={Play}
                          loading={isLoading}
                          onClick={() => setStatus("active")}
                        >
                          Resume
                        </Button>
                      )}
                      {["active", "paused", "pending_review"].includes(c.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={X}
                          className="text-danger hover:bg-danger-soft"
                          loading={isLoading}
                          onClick={() => setStatus("cancelled")}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader
                    title={t.buyer.proofGallery}
                    description={`${proofs.length} submissions`}
                  />
                  <CardBody>
                    {proofs.length === 0 ? (
                      <p className="py-6 text-center text-sm text-fg-muted">
                        No proofs submitted yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {proofs.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between gap-2 py-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-fg">
                                {p.workerName}
                              </p>
                              <a
                                href={p.proofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate text-xs text-brand hover:underline"
                              >
                                {p.proofUrl}
                              </a>
                            </div>
                            <span className="shrink-0 text-xs text-fg-muted">
                              {formatDate(p.submittedAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardBody>
                </Card>
              </div>

              <Card>
                <CardHeader title="Summary" />
                <CardBody className="space-y-3 text-sm">
                  <Row label="Created" value={formatDate(c.createdAt)} />
                  <Row label="Delivered" value={formatNumber(c.delivered)} />
                  <Row
                    label="Remaining"
                    value={formatNumber(c.quantity - c.delivered)}
                  />
                  <Row
                    label="Spent"
                    value={formatMoney(c.delivered * c.ratePerAction)}
                  />
                  <Row
                    label="Escrow left"
                    value={formatMoney(
                      c.totalCost - c.delivered * c.ratePerAction,
                    )}
                  />
                </CardBody>
              </Card>
            </div>
          );
        }}
      </QueryBoundary>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-fg-muted">{label}</span>
      <span className="font-medium text-fg">{value}</span>
    </div>
  );
}
