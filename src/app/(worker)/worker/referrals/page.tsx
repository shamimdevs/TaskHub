"use client";

import { Gift, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { CopyButton } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { useGetReferralsQuery } from "@/redux/features/referrals/referralsApi";
import { fill, t } from "@/lib/i18n/en";
import { formatMoney, formatDate } from "@/lib/utils";

export default function ReferralsPage() {
  const query = useGetReferralsQuery();

  return (
    <>
      <PageHeader title={t.worker.referralTitle} />

      <QueryBoundary query={query} isEmpty={() => false}>
        {(r) => (
          <>
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-brand-500 to-accent-600 p-5 text-white">
                <Gift size={24} />
                <p className="mt-2 max-w-md text-sm text-white/90">
                  {fill(t.worker.referralBlurb, {
                    bonus: formatMoney(r.bonusPerReferral),
                  })}
                </p>
              </div>
              <CardBody className="space-y-3">
                <p className="text-xs font-medium text-fg-muted">
                  {t.worker.yourLink}
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-subtle p-2">
                  <code className="scroll-thin flex-1 overflow-x-auto whitespace-nowrap text-xs text-fg">
                    {r.link}
                  </code>
                  <CopyButton value={r.link} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-fg-muted">Code</span>
                  <Badge tone="brand">{r.code}</Badge>
                  <CopyButton value={r.code} label="Copy code" />
                </div>
              </CardBody>
            </Card>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard label="People invited" value={r.totalInvited} icon={Users} />
              <StatCard
                label="Bonus earned"
                value={formatMoney(r.totalEarned)}
                icon={Gift}
                tone="brand"
              />
            </div>

            <Card className="mt-4">
              <CardHeader title={t.worker.invited} />
              <CardBody>
                <ul className="divide-y divide-border">
                  {r.people.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 py-3">
                      <div>
                        <p className="text-sm font-medium text-fg">{p.name}</p>
                        <p className="text-[11px] text-fg-subtle">
                          Joined {formatDate(p.joinedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.earnedForYou > 0 && (
                          <span className="text-sm font-semibold text-success">
                            +{formatMoney(p.earnedForYou)}
                          </span>
                        )}
                        <Badge
                          tone={
                            p.status === "qualified"
                              ? "success"
                              : p.status === "active"
                                ? "info"
                                : "neutral"
                          }
                        >
                          {p.status}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
