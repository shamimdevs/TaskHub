"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Badge } from "@/components/ui/Badge";
import {
  DataField,
  DataList,
  DataRow,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui/Table";
import { useGetTransactionsQuery } from "@/redux/features/transactions/transactionsApi";
import { TXN_LABELS } from "@/lib/constants";
import { formatMoney, formatDateTime } from "@/lib/utils";
import type { TxnType } from "@/types";

export default function AdminTransactionsPage() {
  const [type, setType] = useState<TxnType | "all">("all");
  const query = useGetTransactionsQuery({ type });

  return (
    <>
      <PageHeader title="Transactions" description="Every credit and debit on the platform" />

      <div className="mb-4">
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as TxnType | "all")}
          className="sm:max-w-[14rem]"
        >
          <option value="all">All types</option>
          {Object.entries(TXN_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      <QueryBoundary query={query} empty={{ title: "No transactions" }}>
        {(rows) => (
          <>
            <Card className="hidden overflow-hidden lg:block">
              <Table>
                <THead>
                  <tr>
                    <TH>Type</TH>
                    <TH>Description</TH>
                    <TH className="text-right">Amount</TH>
                    <TH className="text-right">Balance after</TH>
                    <TH>Status</TH>
                    <TH>Date</TH>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((tx) => (
                    <TR key={tx.id}>
                      <TD className="font-medium">{TXN_LABELS[tx.type]}</TD>
                      <TD className="text-fg-muted">{tx.description}</TD>
                      <TD
                        className={`text-right tabular-nums font-semibold ${
                          tx.direction === "credit" ? "text-success" : "text-fg"
                        }`}
                      >
                        {formatMoney(
                          tx.direction === "credit" ? tx.amount : -tx.amount,
                          { sign: true },
                        )}
                      </TD>
                      <TD className="text-right tabular-nums text-fg-muted">
                        {formatMoney(tx.balanceAfter)}
                      </TD>
                      <TD>
                        <Badge
                          tone={
                            tx.status === "completed"
                              ? "success"
                              : tx.status === "pending"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {tx.status}
                        </Badge>
                      </TD>
                      <TD className="whitespace-nowrap text-fg-muted">
                        {formatDateTime(tx.createdAt)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Card>

            <DataList className="lg:hidden">
              {rows.map((tx) => (
                <DataRow key={tx.id}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-fg">
                      {TXN_LABELS[tx.type]}
                    </p>
                    <p
                      className={`text-sm font-bold tabular-nums ${
                        tx.direction === "credit" ? "text-success" : "text-fg"
                      }`}
                    >
                      {formatMoney(
                        tx.direction === "credit" ? tx.amount : -tx.amount,
                        { sign: true },
                      )}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-fg-muted">{tx.description}</p>
                  <div className="mt-2 border-t border-border pt-1">
                    <DataField label="Balance after">
                      {formatMoney(tx.balanceAfter)}
                    </DataField>
                    <DataField label="Status">{tx.status}</DataField>
                    <DataField label="Date">{formatDateTime(tx.createdAt)}</DataField>
                  </div>
                </DataRow>
              ))}
            </DataList>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
