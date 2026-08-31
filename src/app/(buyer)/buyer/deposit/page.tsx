"use client";

import { PageHeader } from "@/components/layout/AppShell";
import { DepositForm } from "@/components/panels/buyer/DepositForm";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { useGetDepositsQuery } from "@/redux/features/deposits/depositsApi";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatMoney, formatDateTime } from "@/lib/utils";

export default function BuyerDepositPage() {
  const history = useGetDepositsQuery();

  return (
    <>
      <PageHeader title="Add funds" description="Top up your wallet to run campaigns" />
      <DepositForm />

      <Card className="mt-4">
        <CardHeader title="Deposit history" />
        <CardBody>
          <QueryBoundary query={history} empty={{ title: "No deposits yet" }}>
            {(rows) => (
              <ul className="divide-y divide-border">
                {rows.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 py-3">
                    <div>
                      <p className="text-sm font-medium text-fg">
                        {formatMoney(d.amount)}{" "}
                        <span className="text-xs font-normal text-fg-muted">
                          via {PAYMENT_METHODS[d.method].label} · {d.trxId}
                        </span>
                      </p>
                      <p className="text-[11px] text-fg-subtle">
                        {formatDateTime(d.createdAt)}
                      </p>
                    </div>
                    <PaymentStatusBadge status={d.status} />
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </CardBody>
      </Card>
    </>
  );
}
