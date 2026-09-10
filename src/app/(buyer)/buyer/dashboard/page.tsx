"use client";

import Link from "next/link";
import { BadgeDollarSign, Megaphone, Send, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/Stat";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { LinkButton } from "@/components/ui/Button";
import { CampaignCard } from "@/components/panels/buyer/CampaignCard";
import { useGetWalletQuery } from "@/redux/features/wallet/walletApi";
import { useGetCampaignsQuery } from "@/redux/features/campaigns/campaignsApi";
import { formatMoney, formatNumber } from "@/lib/utils";
import { t } from "@/lib/i18n/en";

export default function BuyerDashboard() {
  const wallet = useGetWalletQuery();
  const campaigns = useGetCampaignsQuery();

  const list = campaigns.data ?? [];
  const active = list.filter((c) => c.status === "active");
  const delivered = list.reduce((s, c) => s + c.delivered, 0);
  // Campaigns go live on their own, so there is no review count to show.
  const paused = list.filter((c) => c.status === "paused").length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your campaigns and spending"
        action={
          <LinkButton href="/buyer/campaigns/new" size="sm" icon={Send}>
            {t.buyer.newCampaign}
          </LinkButton>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t.buyer.walletBalance}
          value={formatMoney(wallet.data?.user.balance ?? 0)}
          icon={Wallet}
          hint={
            <Link href="/buyer/deposit" className="text-brand hover:underline">
              Add funds →
            </Link>
          }
        />
        <StatCard
          label={t.buyer.activeCampaigns}
          value={active.length}
          icon={Megaphone}
          tone="accent"
        />
        <StatCard
          label={t.buyer.delivered}
          value={formatNumber(delivered)}
          icon={BadgeDollarSign}
          tone="brand"
        />
        <StatCard
          label="Paused"
          value={paused}
          tone="warning"
          hint="Resume anytime"
        />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Your campaigns"
          action={
            <Link
              href="/buyer/campaigns"
              className="text-xs font-semibold text-brand hover:underline"
            >
              View all
            </Link>
          }
        />
        <CardBody>
          <QueryBoundary
            query={campaigns}
            empty={{
              title: "No campaigns yet",
              description: "Launch your first campaign to start growing.",
              action: (
                <LinkButton href="/buyer/campaigns/new" size="sm">
                  Create campaign
                </LinkButton>
              ),
            }}
          >
            {(cs) => (
              <div className="grid gap-3 sm:grid-cols-2">
                {cs.slice(0, 4).map((c) => (
                  <CampaignCard key={c.id} c={c} />
                ))}
              </div>
            )}
          </QueryBoundary>
        </CardBody>
      </Card>
    </>
  );
}
