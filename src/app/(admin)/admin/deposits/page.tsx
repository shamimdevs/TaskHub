"use client";

import { useMemo, useState } from "react";
import { Download, RotateCcw, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Pagination } from "@/components/ui/Pagination";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Avatar, CopyButton } from "@/components/ui/Misc";
import { PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { ReviewButtons } from "@/components/panels/admin/ReviewButtons";
import { useToast } from "@/components/ui/Toast";
import {
  useGetDepositsQuery,
  useReviewDepositMutation,
} from "@/redux/features/deposits/depositsApi";
import { PAYMENT_METHODS } from "@/lib/constants";
import { dayKey, formatBdt, formatMoney, formatDateTime } from "@/lib/utils";
import type { Deposit, PaymentMethod } from "@/types";

type StatusFilter = "pending" | "approved" | "rejected" | "all";
type MethodFilter = PaymentMethod | "all";

const PAGE_SIZE = 10;

export default function AdminDepositsPage() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [method, setMethod] = useState<MethodFilter>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const query = useGetDepositsQuery({ scope: "all" });
  const [review, { isLoading }] = useReviewDepositMutation();
  const toast = useToast();

  const all = useMemo(() => query.data ?? [], [query.data]);

  // Everything except the status tab: the tab counts and the report both
  // describe the range that is currently selected.
  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((d) => {
      if (method !== "all" && d.method !== method) return false;
      const day = dayKey(d.createdAt);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (!q) return true;
      return (
        d.buyerName.toLowerCase().includes(q) ||
        d.trxId.toLowerCase().includes(q) ||
        d.senderNumber.includes(q)
      );
    });
  }, [all, method, search, from, to]);

  const list = useMemo(
    () => (status === "all" ? scoped : scoped.filter((d) => d.status === status)),
    [scoped, status],
  );

  const report = useMemo(() => summarise(scoped), [scoped]);

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  // Clamped rather than reset in an effect, so a filter that shrinks the list
  // never leaves the view stranded on an empty page.
  const current = Math.min(page, pageCount);
  const rows = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  /** Any filter change starts over: page 3 of the old result set means nothing. */
  const onFilter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  /** Last `days` days, inclusive of today. `null` clears the range. */
  const preset = (days: number | null) => {
    if (days === null) {
      setFrom("");
      setTo("");
    } else {
      const start = new Date();
      start.setDate(start.getDate() - (days - 1));
      setFrom(dayKey(start));
      setTo(dayKey(new Date()));
    }
    setPage(1);
  };

  const resetAll = () => {
    setStatus("pending");
    setMethod("all");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const act = async (id: string, action: "approve" | "reject") => {
    try {
      await review({ id, action }).unwrap();
      toast.success(action === "approve" ? "Deposit approved" : "Deposit rejected");
    } catch {
      toast.error("Action failed");
    }
  };

  return (
    <>
      <PageHeader
        title="Deposits"
        description="Verify manual bKash / Nagad top-ups by TrxID"
        action={
          <Button
            size="sm"
            variant="outline"
            icon={Download}
            disabled={list.length === 0}
            onClick={() => exportCsv(list)}
          >
            Export CSV
          </Button>
        }
      />

      <Card className="mb-4">
        <CardBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Search" className="sm:col-span-2 lg:col-span-1">
              <Input
                icon={Search}
                placeholder="Buyer, TrxID or sender"
                value={search}
                onChange={(e) => onFilter(setSearch)(e.target.value)}
              />
            </Field>
            <Field label="Method">
              <Select
                value={method}
                onChange={(e) =>
                  onFilter(setMethod)(e.target.value as MethodFilter)
                }
              >
                <option value="all">All methods</option>
                {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHODS[m].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="From">
              <Input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => onFilter(setFrom)(e.target.value)}
              />
            </Field>
            <Field label="To">
              <Input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => onFilter(setTo)(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-fg-muted">Quick range</span>
            <Button size="sm" variant="ghost" onClick={() => preset(1)}>
              Today
            </Button>
            <Button size="sm" variant="ghost" onClick={() => preset(7)}>
              7 days
            </Button>
            <Button size="sm" variant="ghost" onClick={() => preset(30)}>
              30 days
            </Button>
            <Button size="sm" variant="ghost" onClick={() => preset(null)}>
              All time
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={RotateCcw}
              className="ml-auto"
              onClick={resetAll}
            >
              Reset
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader
          title="Report"
          description={`${report.count} deposit${
            report.count === 1 ? "" : "s"
          } · ${rangeLabel(from, to)}${
            method === "all" ? "" : ` · ${PAYMENT_METHODS[method].label}`
          }`}
        />
        <CardBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Deposits" value={report.count} />
            <Stat label="Approved" value={report.approved} />
            <Stat label="Pending" value={report.pending} />
            <Stat label="Rejected" value={report.rejected} />
            <Stat
              label="Taka received"
              value={formatBdt(report.approvedBdt)}
            />
            <Stat
              label="Credited to wallets"
              value={formatMoney(report.approvedUsd)}
            />
          </div>
          {report.pending > 0 && (
            <p className="mt-3 border-t border-border pt-3 text-xs text-fg-muted">
              {formatBdt(report.pendingBdt)} still waiting on review — worth{" "}
              {formatMoney(report.pendingUsd)} once approved.
            </p>
          )}
        </CardBody>
      </Card>

      <Tabs<StatusFilter>
        className="mb-4"
        value={status}
        onChange={onFilter(setStatus)}
        items={[
          { value: "pending", label: "Pending", count: report.pending },
          { value: "approved", label: "Approved", count: report.approved },
          { value: "rejected", label: "Rejected", count: report.rejected },
          { value: "all", label: "All", count: report.count },
        ]}
      />

      <QueryBoundary
        query={{ ...query, data: rows }}
        empty={{
          title: "Nothing to review",
          description: "No deposit matches these filters.",
        }}
      >
        {(visible) => (
          <div className="space-y-3">
            <p className="text-xs text-fg-muted">
              Showing {(current - 1) * PAGE_SIZE + 1}–
              {(current - 1) * PAGE_SIZE + visible.length} of {list.length}
            </p>

            {visible.map((d) => (
              <Card key={d.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={d.buyerName} size={34} />
                      <div>
                        <p className="text-sm font-semibold text-fg">
                          {d.buyerName}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {formatDateTime(d.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-fg">
                        {formatBdt(d.amountBdt)}
                      </p>
                      <p className="text-[11px] text-fg-muted">
                        credits {formatMoney(d.amount)} @ ৳{d.usdRate}
                      </p>
                      <PaymentStatusBadge status={d.status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-bg-subtle p-2.5 text-xs">
                    <Meta label="Method">
                      <Badge tone="neutral">
                        {PAYMENT_METHODS[d.method].label}
                      </Badge>
                    </Meta>
                    <Meta label="Sender">{d.senderNumber}</Meta>
                    <Meta label="TrxID">
                      <span className="flex items-center gap-1.5">
                        <code className="font-semibold text-fg">{d.trxId}</code>
                        <CopyButton value={d.trxId} label="" />
                      </span>
                    </Meta>
                    {d.note && <Meta label="Note">{d.note}</Meta>}
                  </div>

                  {d.status === "pending" && (
                    <ReviewButtons
                      loading={isLoading}
                      onApprove={() => act(d.id, "approve")}
                      onReject={() => act(d.id, "reject")}
                    />
                  )}
                </CardBody>
              </Card>
            ))}

            <Pagination page={current} pageCount={pageCount} onPage={setPage} />
          </div>
        )}
      </QueryBoundary>
    </>
  );
}

/** Totals for the selected range, split by what an admin has done with them. */
function summarise(rows: Deposit[]) {
  const sum = (of: Deposit[], pick: (d: Deposit) => number) =>
    of.reduce((n, d) => n + pick(d), 0);
  const approved = rows.filter((d) => d.status === "approved");
  const pending = rows.filter((d) => d.status === "pending");

  return {
    count: rows.length,
    approved: approved.length,
    pending: pending.length,
    rejected: rows.filter((d) => d.status === "rejected").length,
    approvedBdt: sum(approved, (d) => d.amountBdt),
    approvedUsd: sum(approved, (d) => d.amount),
    pendingBdt: sum(pending, (d) => d.amountBdt),
    pendingUsd: sum(pending, (d) => d.amount),
  };
}

function rangeLabel(from: string, to: string) {
  if (from && to) return from === to ? from : `${from} → ${to}`;
  if (from) return `since ${from}`;
  if (to) return `up to ${to}`;
  return "all time";
}

const CSV_COLUMNS: [string, (d: Deposit) => string | number][] = [
  ["Date", (d) => formatDateTime(d.createdAt)],
  ["Buyer", (d) => d.buyerName],
  ["Method", (d) => PAYMENT_METHODS[d.method].label],
  ["Sender", (d) => d.senderNumber],
  ["TrxID", (d) => d.trxId],
  ["Amount (BDT)", (d) => d.amountBdt],
  ["Rate", (d) => d.usdRate],
  ["Credited (USD)", (d) => d.amount],
  ["Status", (d) => d.status],
  ["Reviewed at", (d) => (d.reviewedAt ? formatDateTime(d.reviewedAt) : "")],
  ["Note", (d) => d.note ?? ""],
];

/** The report as a spreadsheet — the whole filtered set, not just this page. */
function exportCsv(rows: Deposit[]) {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [
    CSV_COLUMNS.map(([head]) => cell(head)).join(","),
    ...rows.map((d) => CSV_COLUMNS.map(([, pick]) => cell(pick(d))).join(",")),
  ].join("\r\n");

  // A BOM keeps Excel from mangling the taka sign and Bangla names.
  const url = URL.createObjectURL(
    new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `deposits-${dayKey(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-fg-subtle">{label}</p>
      <div className="mt-0.5 font-medium text-fg">{children}</div>
    </div>
  );
}
