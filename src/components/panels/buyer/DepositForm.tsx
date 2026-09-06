"use client";

import { useState } from "react";
import { BadgeDollarSign, CheckCircle2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { Alert, CopyButton } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import { useCreateDepositMutation } from "@/redux/features/deposits/depositsApi";
import { useGetSettingsQuery } from "@/redux/features/settings/settingsApi";
import { LIMITS, PAYMENT_METHODS, USD_RATE } from "@/lib/constants";
import { fill, t } from "@/lib/i18n/en";
import { formatBdt, formatMoney, toUsd } from "@/lib/utils";
import type { PaymentMethod } from "@/types";

const QUICK = [500, 1000, 2000, 5000];

export function DepositForm() {
  const toast = useToast();
  const [create, { isLoading }] = useCreateDepositMutation();
  const { data: settings } = useGetSettingsQuery();

  const [method, setMethod] = useState<PaymentMethod>("bkash");
  // Buyers send taka; the wallet is credited in dollars at today's rate.
  const [amountBdt, setAmountBdt] = useState(1000);
  const [sender, setSender] = useState("");
  const [trx, setTrx] = useState("");
  const [ok, setOk] = useState(false);

  const m = PAYMENT_METHODS[method];
  const usdRate = settings?.usdRate ?? USD_RATE;
  const minDeposit = settings?.minDeposit ?? LIMITS.minDeposit;
  const credited = toUsd(amountBdt, usdRate);
  const low = credited < minDeposit;

  const submit = async () => {
    if (!sender.trim() || !trx.trim() || low) {
      toast.error(
        low
          ? `Minimum top-up is ${formatBdt(Math.ceil(minDeposit * usdRate))}`
          : "Fill in your number and TrxID",
      );
      return;
    }
    try {
      await create({
        method,
        senderNumber: sender,
        trxId: trx,
        amountBdt,
      }).unwrap();
      setOk(true);
      setSender("");
      setTrx("");
      toast.success("Deposit submitted", "Pending admin approval.");
    } catch {
      toast.error(t.common.somethingWrong);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <Card>
          <CardHeader title={t.buyer.depositTitle} description={t.buyer.depositBlurb} />
          <CardBody className="space-y-4">
            <Field label="Payment method">
              <SegmentedControl
                value={method}
                onChange={(v) => setMethod(v as PaymentMethod)}
                segments={(["bkash", "nagad", "rocket"] as PaymentMethod[]).map(
                  (k) => ({ value: k, label: PAYMENT_METHODS[k].label }),
                )}
              />
            </Field>

            <div className="rounded-lg border border-border bg-bg-subtle p-3">
              <p className="text-xs text-fg-muted">{t.buyer.sendMoneyTo}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span
                  className="text-base font-bold"
                  style={{ color: m.color }}
                >
                  {m.number}
                </span>
                <CopyButton value={m.number.replace(/\D/g, "")} />
              </div>
              <p className="mt-1 text-[11px] text-fg-subtle">
                Use “Send Money” (personal), not payment.
              </p>
            </div>

            <Field
              label="Amount you are sending"
              hint={`Minimum ${formatBdt(Math.ceil(minDeposit * usdRate))} · $1 = ${formatBdt(
                usdRate,
              )}`}
            >
              <SegmentedControl
                value={String(amountBdt)}
                onChange={(v) => setAmountBdt(Number(v))}
                segments={QUICK.map((q) => ({
                  value: String(q),
                  label: formatBdt(q),
                }))}
              />
              <Input
                className="mt-2"
                type="number"
                min={1}
                value={amountBdt}
                onChange={(e) => setAmountBdt(Number(e.target.value) || 0)}
                suffix="৳"
                invalid={low}
              />
              <div className="mt-2 flex items-center justify-between rounded-lg bg-bg-subtle px-3 py-2 text-sm">
                <span className="text-fg-muted">Credited to your wallet</span>
                <span className="font-bold text-fg">{formatMoney(credited)}</span>
              </div>
            </Field>

            <Field label={fill(t.buyer.senderNumber, { method: m.label })} required>
              <Input
                inputMode="numeric"
                placeholder="01XXXXXXXXX"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
              />
            </Field>

            <Field label={t.buyer.trxId} required hint="e.g. 9F2K7ABCDE">
              <Input
                placeholder="Transaction ID from your SMS"
                value={trx}
                onChange={(e) => setTrx(e.target.value.toUpperCase())}
              />
            </Field>

            <Button
              fullWidth
              icon={ok ? CheckCircle2 : BadgeDollarSign}
              loading={isLoading}
              onClick={submit}
            >
              {ok ? "Submitted" : t.buyer.submitDeposit}
            </Button>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4">
        {ok && <Alert tone="info">{t.buyer.depositPending}</Alert>}
        <Card>
          <CardHeader title="How it works" />
          <CardBody>
            <ol className="space-y-2 text-sm text-fg">
              {[
                `Send money to the ${m.label} number shown`,
                "Copy the Transaction ID (TrxID) from your SMS",
                "Enter your number + TrxID and submit",
                `Admin verifies and your wallet is credited in dollars at ৳${usdRate} / $1`,
              ].map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-bg-subtle text-[11px] font-bold text-fg-muted">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
