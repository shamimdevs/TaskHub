"use client";

import { useEffect, useState } from "react";
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
import { PRICING } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";
import { t } from "@/lib/i18n/en";
import type { PlatformSettings } from "@/types";

export default function AdminSettingsPage() {
  const query = useGetSettingsQuery();
  const [update, { isLoading }] = useUpdateSettingsMutation();
  const toast = useToast();
  const [form, setForm] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    if (query.data && !form) setForm(query.data);
  }, [query.data, form]);

  const set = <K extends keyof PlatformSettings>(k: K, v: PlatformSettings[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form) return;
    try {
      await update(form).unwrap();
      toast.success("Settings saved");
    } catch {
      toast.error("Could not save");
    }
  };

  const workerCut = form
    ? Math.round((form.workerRewardPerAction / PRICING.clientRatePerAction) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title={t.admin.settingsTitle}
        description="Pricing, fees and platform-wide rules"
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
                <CardHeader title={t.admin.pricing} />
                <CardBody className="space-y-4">
                  <Field
                    label={t.admin.clientRate}
                    hint={`Buyers pay ${formatMoney(
                      form.clientRatePer1k / 1000,
                    )} per action`}
                  >
                    <Input
                      type="number"
                      suffix="৳"
                      value={form.clientRatePer1k}
                      onChange={(e) =>
                        set("clientRatePer1k", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field
                    label={t.admin.workerReward}
                    hint={`Worker keeps ${workerCut}% · platform margin ${
                      100 - workerCut
                    }%`}
                  >
                    <Input
                      type="number"
                      step="0.01"
                      suffix="৳"
                      value={form.workerRewardPerAction}
                      onChange={(e) =>
                        set("workerRewardPerAction", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label={t.admin.referralBonus}>
                    <Input
                      type="number"
                      suffix="৳"
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
                  <Field label={t.admin.minWithdraw}>
                    <Input
                      type="number"
                      suffix="৳"
                      value={form.minWithdraw}
                      onChange={(e) => set("minWithdraw", Number(e.target.value))}
                    />
                  </Field>
                  <Field label={t.admin.withdrawFee}>
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
                <CardHeader title="Toggles" />
                <CardBody className="space-y-4">
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
