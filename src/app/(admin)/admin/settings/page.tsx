"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { useToast } from "@/components/ui/Toast";
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from "@/redux/features/settings/settingsApi";
import { PLATFORMS, TASK_TYPES } from "@/lib/constants";
import { formatBdt, formatMoney } from "@/lib/utils";
import { t } from "@/lib/i18n/en";
import type {
  Platform,
  PlatformSettings,
  RateCardEntry,
  SettingsPayload,
} from "@/types";

const rateKey = (r: { platform: string; type: string }) =>
  `${r.platform}:${r.type}`;

export default function AdminSettingsPage() {
  const query = useGetSettingsQuery();
  const [update, { isLoading }] = useUpdateSettingsMutation();
  const toast = useToast();
  // Unsaved edits live as an overlay on the fetched data, so a refetch never
  // needs an effect to seed the form and never clobbers what is being typed.
  const [draft, setDraft] = useState<Partial<PlatformSettings>>({});
  const [rateEdits, setRateEdits] = useState<
    Record<string, Partial<RateCardEntry>>
  >({});

  const form: SettingsPayload | null = query.data
    ? { ...query.data, ...draft }
    : null;
  const rates: RateCardEntry[] = (query.data?.rates ?? []).map((r) => ({
    ...r,
    ...rateEdits[rateKey(r)],
  }));

  const set = <K extends keyof PlatformSettings>(k: K, v: PlatformSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const setRate = (entry: RateCardEntry, patch: Partial<RateCardEntry>) =>
    setRateEdits((e) => ({
      ...e,
      [rateKey(entry)]: { ...e[rateKey(entry)], ...patch },
    }));

  const save = async () => {
    if (!form) return;
    try {
      // `rates` last: the edited list wins over the copy inside `form`.
      await update({ ...form, rates }).unwrap();
      setDraft({});
      setRateEdits({});
      toast.success("Settings saved");
    } catch {
      toast.error("Could not save");
    }
  };

  return (
    <>
      <PageHeader
        title={t.admin.settingsTitle}
        description="Dollar rate, per-platform prices and platform-wide rules"
        action={
          <Button size="sm" icon={Save} loading={isLoading} onClick={save}>
            {t.common.save}
          </Button>
        }
      />

      <QueryBoundary query={query} isEmpty={() => false}>
        {() =>
          form && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader
                  title={t.admin.currency}
                  description="Everything on the platform is priced in dollars. This rate is used only where real cash moves — deposits and withdrawals."
                />
                <CardBody className="space-y-4">
                  <Field
                    label={t.admin.usdRate}
                    hint={`$1 = ${formatBdt(form.usdRate)} · a ${formatBdt(
                      1000,
                    )} top-up credits ${formatMoney(
                      form.usdRate ? 1000 / form.usdRate : 0,
                    )}`}
                  >
                    <Input
                      type="number"
                      step="0.01"
                      suffix="৳ / $1"
                      value={form.usdRate}
                      onChange={(e) => set("usdRate", Number(e.target.value))}
                    />
                  </Field>
                  <Field
                    label={t.admin.minDeposit}
                    hint="Smallest top-up that will be credited"
                  >
                    <Input
                      type="number"
                      step="0.01"
                      suffix="$"
                      value={form.minDeposit}
                      onChange={(e) => set("minDeposit", Number(e.target.value))}
                    />
                  </Field>
                  <Field label={t.admin.referralBonus}>
                    <Input
                      type="number"
                      step="0.01"
                      suffix="$"
                      value={form.referralBonus}
                      onChange={(e) =>
                        set("referralBonus", Number(e.target.value))
                      }
                    />
                  </Field>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Payouts & verification" />
                <CardBody className="space-y-4">
                  <Field
                    label={t.admin.minWithdraw}
                    hint="Smallest payout a worker can request"
                  >
                    <Input
                      type="number"
                      step="0.01"
                      suffix="$"
                      value={form.minWithdraw}
                      onChange={(e) => set("minWithdraw", Number(e.target.value))}
                    />
                  </Field>
                  <Field
                    label={t.admin.withdrawFee}
                    hint="The platform's only commission — deducted from each withdrawal."
                  >
                    <Input
                      type="number"
                      suffix="%"
                      value={form.withdrawFeePct}
                      onChange={(e) =>
                        set("withdrawFeePct", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field
                    label={t.admin.holdDays}
                    hint="Days a reward is held for follower-count verification"
                  >
                    <Input
                      type="number"
                      value={form.holdDays}
                      onChange={(e) => set("holdDays", Number(e.target.value))}
                    />
                  </Field>
                </CardBody>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader
                  title={t.admin.rateCard}
                  description="One price per platform and action. The buyer pays it and the worker earns it — the platform keeps nothing here."
                />
                <CardBody className="space-y-5">
                  {(Object.keys(PLATFORMS) as Platform[]).map((p) => {
                    const rows = rates.filter((r) => r.platform === p);
                    if (!rows.length) return null;
                    return (
                      <div key={p}>
                        <p
                          className="text-xs font-bold uppercase tracking-wide"
                          style={{ color: PLATFORMS[p].color }}
                        >
                          {PLATFORMS[p].label}
                        </p>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {rows.map((r) => (
                            <div
                              key={rateKey(r)}
                              className="rounded-lg border border-border p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-fg">
                                  {TASK_TYPES[r.type].label}
                                </span>
                                <Switch
                                  checked={r.enabled}
                                  onChange={(v) => setRate(r, { enabled: v })}
                                />
                              </div>
                              <Input
                                className="mt-2"
                                type="number"
                                step="0.001"
                                suffix="$"
                                value={r.rate}
                                disabled={!r.enabled}
                                onChange={(e) =>
                                  setRate(r, { rate: Number(e.target.value) })
                                }
                              />
                              <p className="mt-1.5 text-[11px] text-fg-subtle">
                                per {TASK_TYPES[r.type].unit.replace(/s$/, "")} ·{" "}
                                {formatMoney(r.rate * 1000)} per 1,000
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader title="Automation" />
                <CardBody className="space-y-4">
                  <Switch
                    checked={form.autoVerify}
                    onChange={(v) => set("autoVerify", v)}
                    label={t.admin.autoVerify}
                    description="Facebook follow campaigns on a connected page go live without review, and their rewards clear against the page's follower count."
                  />
                  {form.autoVerify && (
                    <Field
                      label={t.admin.autoVerifyGrace}
                      hint="How long a submission waits for the follower count to move before it is turned down"
                    >
                      <Input
                        type="number"
                        suffix="min"
                        value={form.autoVerifyGraceMins}
                        onChange={(e) =>
                          set("autoVerifyGraceMins", Number(e.target.value))
                        }
                      />
                    </Field>
                  )}
                  <Switch
                    checked={form.autoApproveDeposits}
                    onChange={(v) => set("autoApproveDeposits", v)}
                    label={t.admin.autoApprove}
                    description="Skip manual review for verified TrxIDs"
                  />
                  <Switch
                    checked={form.maintenanceMode}
                    onChange={(v) => set("maintenanceMode", v)}
                    label={t.admin.maintenance}
                    description="Workers and buyers see a maintenance screen"
                  />
                </CardBody>
              </Card>
            </div>
          )
        }
      </QueryBoundary>
    </>
  );
}
