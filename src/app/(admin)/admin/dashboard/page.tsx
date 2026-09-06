"use client";

import Link from "next/link";
import {
  BadgeDollarSign,
  ClipboardList,
  Coins,
  FileCheck2,
  Percent,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/Stat";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { MiniBarChart } from "@/components/panels/worker/MiniBarChart";
import { useGetKpisQuery } from "@/redux/features/kpis/kpisApi";
import { compactNumber, formatNumber } from "@/lib/utils";
import { t } from "@/lib/i18n/en";

export default function AdminDashboard() {
  const query = useGetKpisQuery();

  return (
    <>
      <PageHeader
        title={t.admin.overview}
        description="Commission, users and everything that needs review"
      />

      <QueryBoundary query={query} isEmpty={() => false}>
        {(k) => (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label={t.admin.commissionEarned}
                value={`$${compactNumber(k.commissionEarned)}`}
                icon={Coins}
                tone="brand"
              />
              <StatCard
                label={t.admin.commissionRate}
                value={`${k.withdrawFeePct}%`}
                icon={Percent}
                tone="accent"
              />
              <StatCard
                label={t.admin.platformVolume}
                value={`$${compactNumber(k.platformVolume)}`}
                icon={TrendingUp}
              />
              <StatCard
                label={t.admin.payoutsPaid}
                value={`$${compactNumber(k.payoutsPaid)}`}
                icon={Wallet}
                tone="neutral"
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader
                  title="Commission vs payout"
                  description="Last 12 months"
                />
                <CardBody>
                  <MiniBarChart
                    height={160}
                    data={k.commissionSeries.map((r) => ({
                      label: r.label,
                      value: r.commission,
                    }))}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Community" />
                <CardBody className="space-y-3">
                  <Line
                    icon={Users}
                    label={t.admin.totalUsers}
                    value={formatNumber(k.totalUsers)}
                  />
                  <Line
                    icon={Users}
                    label={t.admin.activeWorkers}
                    value={formatNumber(k.activeWorkers)}
                  />
                  <Line
                    icon={Users}
                    label="Active buyers"
                    value={formatNumber(k.activeBuyers)}
                  />
                </CardBody>
              </Card>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <QueueCard
                href="/admin/deposits"
                icon={BadgeDollarSign}
                label={t.admin.pendingDeposits}
                count={k.pendingDeposits}
              />
              <QueueCard
                href="/admin/withdrawals"
                icon={Wallet}
                label={t.admin.pendingWithdrawals}
                count={k.pendingWithdrawals}
              />
              <QueueCard
                href="/admin/submissions"
                icon={FileCheck2}
                label={t.admin.onHold}
                count={k.submissionsOnHold}
              />
              <QueueCard
                href="/admin/campaigns"
                icon={ClipboardList}
                label={t.admin.awaitingReview}
                count={k.campaignsAwaitingReview}
              />
            </div>
          </>
        )}
      </QueryBoundary>
    </>
  );
}

function Line({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-fg-muted">
        <Icon size={15} /> {label}
      </span>
      <span className="font-semibold text-fg">{value}</span>
    </div>
  );
}

function QueueCard({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  icon: typeof Users;
  label: string;
  count: number;
}) {
  return (
    <Link href={href}>
      <Card interactive className="p-4">
        <div className="flex items-center justify-between">
          <span className="rounded-lg bg-warning-soft p-1.5 text-warning">
            <Icon size={15} />
          </span>
          <span className="text-2xl font-bold text-fg">{count}</span>
        </div>
        <p className="mt-2 text-xs font-medium text-fg-muted">{label}</p>
      </Card>
    </Link>
  );
}
