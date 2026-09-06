"use client";

import { useState } from "react";
import { ArrowDownToLine, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Misc";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useGetWalletQuery } from "@/redux/features/wallet/walletApi";
import {
  useCreateWithdrawalMutation,
  useGetWithdrawalsQuery,
} from "@/redux/features/withdrawals/withdrawalsApi";
import { useGetSettingsQuery } from "@/redux/features/settings/settingsApi";
import { FEES, LIMITS, PAYMENT_METHODS, USD_RATE } from "@/lib/constants";
import { fill, t } from "@/lib/i18n/en";
import { formatBdt, formatMoney, formatDate, toBdt } from "@/lib/utils";
import type { PaymentMethod } from "@/types";

export default function WithdrawPage() {
  const wallet = useGetWalletQuery();
  const history = useGetWithdrawalsQuery();
  const { data: settings } = useGetSettingsQuery();
  const [create, { isLoading }] = useCreateWithdrawalMutation();
  const toast = useToast();

  const [method, setMethod] = useState<PaymentMethod>("bkash");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [ok, setOk] = useState(false);

  // Balance and request are dollars; the payout is sent in taka.
  const feePct = settings?.withdrawFeePct ?? FEES.withdrawFeePct;
  const minWithdraw = settings?.minWithdraw ?? LIMITS.minWithdraw;
  const usdRate = settings?.usdRate ?? USD_RATE;

  const balance = wallet.data?.user.balance ?? 0;
  const amt = Number(amount) || 0;
  const fee = +((amt * feePct) / 100).toFixed(2);
  const net = +(amt - fee).toFixed(2);
  const tooLow = amt > 0 && amt < minWithdraw;
  const tooHigh = amt > balance;

  const submit = async () => {
    if (!account.trim() || tooLow || tooHigh || amt <= 0) {
      toast.error("Check the amount and account number");
      return;
    }
    try {
      await create({ method, accountNumber: account, amount: amt }).unwrap();
      setOk(true);
      setAmount("");
      setAccount("");
      toast.success("Withdrawal requested", "Admin will review it shortly.");
    } catch {
      toast.error(t.common.somethingWrong);
    }
  };

  return (
    <>
      <PageHeader title={t.worker.withdrawTitle} back={{ href: "/worker/wallet" }} />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader
            title="Request withdrawal"
            description={fill(t.worker.minWithdrawNote, {
              min: formatMoney(minWithdraw),
            })}
          />
          <CardBody className="space-y-4">
            {ok && (
              <Alert tone="success">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={15} /> Request submitted — pending approval.
                </span>
              </Alert>
            )}

            <Field label={t.worker.withdrawMethod}>
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              >
                {(["bkash", "nagad", "rocket"] as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHODS[m].label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t.worker.accountNumber} required>
              <Input
                inputMode="numeric"
                placeholder="01XXXXXXXXX"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              />
            </Field>

            <Field
              label={t.worker.amount}
              required
              error={
                tooLow
                  ? `Minimum is ${formatMoney(minWithdraw)}`
                  : tooHigh
                    ? "More than your available balance"
                    : undefined
              }
            >
              <Input
                inputMode="decimal"
                placeholder="0"
                suffix="$"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                invalid={tooLow || tooHigh}
              />
            </Field>

            <div className="rounded-lg bg-bg-subtle p-3 text-sm">
              <Row label={t.worker.amount} value={formatMoney(amt)} />
              <Row
                label={fill(t.worker.feeLine, { pct: feePct })}
                value={`− ${formatMoney(fee)}`}
              />
              <div className="my-2 border-t border-border" />
              <Row
                label={t.worker.youReceive}
                value={formatMoney(Math.max(0, net))}
                strong
              />
              <Row
                label={`Sent to ${PAYMENT_METHODS[method].label} at ৳${usdRate} / $1`}
                value={formatBdt(toBdt(Math.max(0, net), usdRate))}
              />
            </div>

            <Button
              fullWidth
              icon={ArrowDownToLine}
              loading={isLoading}
              onClick={submit}
            >
              {t.worker.requestWithdraw}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent withdrawals" />
          <CardBody>
            <QueryBoundary
              query={history}
              empty={{ title: "No withdrawals yet" }}
            >
              {(rows) => (
                <ul className="divide-y divide-border">
                  {rows.slice(0, 8).map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-fg">
                          {formatMoney(w.net)}{" "}
                          <span className="text-xs font-normal text-fg-muted">
                            ({formatBdt(w.payoutBdt)}) via{" "}
                            {PAYMENT_METHODS[w.method].label}
                          </span>
                        </p>
                        <p className="text-[11px] text-fg-subtle">
                          {formatDate(w.createdAt)}
                        </p>
                      </div>
                      <PaymentStatusBadge status={w.status} />
                    </li>
                  ))}
                </ul>
              )}
            </QueryBoundary>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-fg-muted">{label}</span>
      <span className={strong ? "font-bold text-fg" : "font-medium text-fg"}>
        {value}
      </span>
    </div>
  );
}
