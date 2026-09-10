"use client";

import { ArrowDownToLine, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { LinkButton } from "@/components/ui/Button";
import { WalletLedger } from "@/components/panels/WalletLedger";
import { useGetWalletQuery } from "@/redux/features/wallet/walletApi";
import { formatMoney } from "@/lib/utils";

export default function WorkerWalletPage() {
  const query = useGetWalletQuery();

  return (
    <>
      <PageHeader
        title="Wallet"
        description="Your balance and transaction history"
        action={
          <LinkButton href="/worker/withdraw" size="sm" icon={ArrowDownToLine}>
            Withdraw
          </LinkButton>
        }
      />

      <QueryBoundary query={query} isEmpty={() => false}>
        {(w) => (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Balance"
                value={formatMoney(w.user.balance)}
                icon={TrendingUp}
                hint={`${formatMoney(
                  Math.max(0, w.user.balance - w.user.heldBalance),
                )} withdrawable`}
              />
              <StatCard
                label="On hold"
                value={formatMoney(w.user.heldBalance)}
                tone="warning"
                hint="In your balance, not withdrawable yet"
              />
              <StatCard
                label="Lifetime earned"
                value={formatMoney(w.user.lifetimeEarned ?? 0)}
                tone="brand"
              />
              <StatCard
                label="Withdrawn"
                value={formatMoney(
                  w.transactions
                    .filter((t) => t.type === "withdrawal")
                    .reduce((s, t) => s + t.amount, 0),
                )}
                tone="neutral"
              />
            </div>

            <Card className="mt-4">
              <CardHeader title="Transactions" description="Most recent first" />
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
