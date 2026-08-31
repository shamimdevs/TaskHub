"use client";

import { BadgeDollarSign, Megaphone, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { LinkButton } from "@/components/ui/Button";
import { WalletLedger } from "@/components/panels/WalletLedger";
import { useGetWalletQuery } from "@/redux/features/wallet/walletApi";
import { formatMoney } from "@/lib/utils";

export default function BuyerWalletPage() {
  const query = useGetWalletQuery();

  return (
    <>
      <PageHeader
        title="Wallet"
        description="Balance, deposits and campaign spend"
        action={
          <LinkButton href="/buyer/deposit" size="sm" icon={BadgeDollarSign}>
            Add funds
          </LinkButton>
        }
      />

      <QueryBoundary query={query} isEmpty={() => false}>
        {(w) => (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <StatCard label="Balance" value={formatMoney(w.user.balance)} icon={BadgeDollarSign} />
              <StatCard
                label="Lifetime spent"
                value={formatMoney(w.user.lifetimeSpent ?? 0)}
                icon={Megaphone}
                tone="accent"
              />
              <StatCard
                label="This month"
                value={formatMoney(
                  w.transactions
                    .filter((t) => t.type === "campaign_spend")
                    .reduce((s, t) => s + t.amount, 0),
                )}
                icon={TrendingDown}
                tone="warning"
              />
            </div>

            <Card className="mt-4">
              <CardHeader title="Transactions" />
              <CardBody>
                <WalletLedger rows={w.transactions} />
              </CardBody>
            </Card>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
