"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2, Rocket, Zap } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import { useCreateCampaignMutation } from "@/redux/features/campaigns/campaignsApi";
import { useGetWalletQuery } from "@/redux/features/wallet/walletApi";
import { useGetSettingsQuery } from "@/redux/features/settings/settingsApi";
import { useGetFacebookPagesQuery } from "@/redux/features/facebook/facebookApi";
import { LIMITS, PLATFORMS, RATE_CARD, TASK_TYPES } from "@/lib/constants";
import { t } from "@/lib/i18n/en";
import { formatMoney, formatNumber } from "@/lib/utils";
import type { Platform, TaskType } from "@/types";

const QUICK = [1000, 2000, 5000, 10000];

export function CampaignForm() {
  const router = useRouter();
  const toast = useToast();
  const [create, { isLoading }] = useCreateCampaignMutation();
  const { data: wallet } = useGetWalletQuery();
  const { data: settings } = useGetSettingsQuery();
  const { data: facebook } = useGetFacebookPagesQuery();
  const connectStatus = useSearchParams().get("fb");

  const [platform, setPlatform] = useState<Platform>("facebook");
  const [type, setType] = useState<TaskType>("follow");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [qty, setQty] = useState(1000);
  const [note, setNote] = useState("");
  const [pageId, setPageId] = useState("");

  // Live prices from the admin rate card; the seeded defaults stand in until
  // the settings request lands. A paused action is priced 0 and hidden.
  const rateOf = (p: Platform, action: TaskType) => {
    const row = settings?.rates.find(
      (r) => r.platform === p && r.type === action,
    );
    if (row) return row.enabled ? row.rate : 0;
    return RATE_CARD[p]?.[action] ?? 0;
  };

  const offered = PLATFORMS[platform].actions.filter((a) => rateOf(platform, a) > 0);
  const allowedTypes = offered.length ? offered : PLATFORMS[platform].actions;
  const effType = allowedTypes.includes(type) ? type : allowedTypes[0];

  const rate = rateOf(platform, effType);
  const cost = +(qty * rate).toFixed(2);
  const balance = wallet?.user.balance ?? 0;
  const short = cost > balance;

  const autoVerifyOn = settings?.autoVerify ?? true;

  // Three combinations can run hands-off, and they do not work the same way.
  //
  // YouTube subscribes are the strong one: we ask each worker's own account
  // whether they subscribed, so nothing has to be connected here at all — just
  // paste the channel link.
  //
  // Facebook and Instagram follows can only be counted, so they need an account
  // we hold a token for: a connected page, or the Instagram business account
  // attached to one.
  const directMode =
    autoVerifyOn && platform === "youtube" && effType === "subscribe";

  const needsPage =
    autoVerifyOn &&
    effType === "follow" &&
    (platform === "facebook" || platform === "instagram");

  const pages = facebook?.pages ?? [];
  // An Instagram campaign can only target a page that has an Instagram
  // business account behind it — there is nothing else to measure.
  const eligiblePages =
    platform === "instagram" ? pages.filter((pg) => pg.instagram) : pages;
  const selectedPage = eligiblePages.find((pg) => pg.id === pageId);
  const countMode = needsPage && Boolean(selectedPage);

  /** The link workers will actually be sent to under count verification. */
  const countTargetUrl =
    selectedPage &&
    (platform === "instagram" ? selectedPage.instagram!.url : selectedPage.url);

  const autoMode = directMode || countMode;

  const launch = async () => {
    if (!title.trim()) {
      toast.error("Add a campaign title");
      return;
    }
    if (!countMode && !url.trim()) {
      toast.error("Add a target link");
      return;
    }
    if (short) {
      toast.error(t.buyer.insufficient);
      return;
    }
    try {
      const c = await create({
        platform,
        type: effType,
        title,
        targetUrl: countMode ? countTargetUrl! : url,
        quantity: qty,
        note,
        pageId: countMode ? selectedPage!.id : undefined,
      }).unwrap();
      // A direct campaign only goes live if the channel actually resolved, so
      // report what came back rather than what we hoped for.
      toast.success(
        c.status === "active" ? "Campaign is live" : "Campaign submitted for review",
      );
      router.push(`/buyer/campaigns/${c.id}`);
    } catch {
      toast.error(t.common.somethingWrong);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <Card>
          <CardHeader title={t.buyer.createTitle} />
          <CardBody className="space-y-4">
            <Field label={t.buyer.platform}>
              <div className="grid grid-cols-3 gap-2 xs:grid-cols-5">
                {(Object.keys(PLATFORMS) as Platform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      platform === p
                        ? "border-brand bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                        : "border-border text-fg-muted hover:bg-bg-subtle"
                    }`}
                  >
                    {PLATFORMS[p].label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={t.buyer.actionType}>
              <Select
                value={effType}
                onChange={(e) => setType(e.target.value as TaskType)}
              >
                {allowedTypes.map((a) => (
                  <option key={a} value={a}>
                    {TASK_TYPES[a].label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Campaign title" required>
              <Input
                placeholder="e.g. Grow my clothing brand page"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            {needsPage && (
              <Field
                label={platform === "instagram" ? "Instagram account" : "Facebook page"}
                hint={
                  platform === "instagram"
                    ? "Instagram will not say who followed you, so a campaign is measured against your follower count. Connect the Facebook page your Instagram business account is attached to."
                    : "Connect the page and the campaign runs itself — no review, and every follow is checked against your follower count."
                }
              >
                {connectStatus === "connected" && (
                  <Alert tone="success">Facebook page connected.</Alert>
                )}
                {connectStatus === "no_pages" && (
                  <Alert tone="warning">
                    That Facebook account does not administer any page.
                  </Alert>
                )}
                {(connectStatus === "failed" || connectStatus === "invalid_state") && (
                  <Alert tone="danger">
                    Could not connect to Facebook. Please try again.
                  </Alert>
                )}

                {eligiblePages.length > 0 && (
                  <Select
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                  >
                    <option value="">Verify manually (paste a link)</option>
                    {eligiblePages.map((pg) => (
                      <option key={pg.id} value={pg.id}>
                        {platform === "instagram"
                          ? `@${pg.instagram!.username ?? pg.name} · ${formatNumber(
                              pg.instagram!.followers,
                            )} followers`
                          : `${pg.name} · ${formatNumber(pg.followers)} followers`}
                      </option>
                    ))}
                  </Select>
                )}

                {platform === "instagram" &&
                  pages.length > 0 &&
                  eligiblePages.length === 0 && (
                    <Alert tone="warning">
                      None of your connected pages has an Instagram business
                      account attached. Switch the Instagram account to Business
                      or Creator, link it to a Facebook page, then connect again.
                    </Alert>
                  )}

                {facebook?.configured !== false && (
                  <a
                    href="/api/integrations/facebook/connect"
                    className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-border-strong bg-card px-4 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-bg-subtle"
                  >
                    <Link2 size={15} />
                    {pages.length ? "Connect another page" : "Connect Facebook page"}
                  </a>
                )}
                {facebook?.configured === false && (
                  <Alert tone="info">
                    Facebook auto-verification is not configured on this server.
                  </Alert>
                )}
              </Field>
            )}

            {countMode && (
              <Alert tone="success">
                <span className="flex items-start gap-2">
                  <Zap size={15} className="mt-0.5 shrink-0" />
                  <span>
                    Workers will be sent to{" "}
                    <span className="font-semibold">{countTargetUrl}</span>. The
                    campaign goes live immediately and rewards clear on their own
                    as your follower count moves.
                  </span>
                </span>
              </Alert>
            )}

            {directMode && (
              <Alert tone="success">
                <span className="flex items-start gap-2">
                  <Zap size={15} className="mt-0.5 shrink-0" />
                  <span>
                    Paste your channel link below and this campaign runs itself.
                    YouTube is the one platform that will tell us whether a
                    specific person subscribed, so every submission is checked
                    against that worker&apos;s own subscriptions — no follower
                    maths, and no waiting on a review.
                  </span>
                </span>
              </Alert>
            )}

            {!countMode && (
              <Field
                label={t.buyer.targetUrl}
                hint={
                  directMode
                    ? "Your channel link — youtube.com/@handle or /channel/UC…"
                    : t.buyer.targetUrlHint
                }
                required
              >
                <Input
                  placeholder={
                    directMode
                      ? "https://www.youtube.com/@yourchannel"
                      : `https://${platform}.com/yourpage`
                  }
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </Field>
            )}

            <Field label={t.buyer.quantity}>
              <SegmentedControl
                value={String(qty)}
                onChange={(v) => setQty(Number(v))}
                segments={QUICK.map((q) => ({
                  value: String(q),
                  label: formatNumber(q),
                }))}
              />
              <Input
                className="mt-2"
                type="number"
                min={LIMITS.minCampaignQty}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 0)}
                suffix={TASK_TYPES[effType].unit}
              />
            </Field>

            <Field label={t.buyer.campaignNote}>
              <Textarea
                placeholder="Any instructions for workers…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader title={t.buyer.costSummary} />
          <CardBody className="space-y-2 text-sm">
            <Row
              label={`${t.buyer.ratePerAction} · ${PLATFORMS[platform].label} ${TASK_TYPES[
                effType
              ].label.toLowerCase()}`}
              value={formatMoney(rate)}
            />
            <Row label={t.buyer.quantity} value={formatNumber(qty)} />
            <div className="my-2 border-t border-border" />
            <Row label={t.buyer.subtotal} value={formatMoney(cost)} strong />
            <Row label="Your balance" value={formatMoney(balance)} muted />
          </CardBody>
        </Card>

        {short && <Alert tone="warning">{t.buyer.insufficient}</Alert>}

        <Button
          fullWidth
          size="lg"
          icon={Rocket}
          loading={isLoading}
          onClick={launch}
        >
          {t.buyer.launch}
        </Button>
        <p className="text-center text-[11px] text-fg-subtle">
          {autoMode
            ? "This campaign goes live immediately and is checked automatically."
            : "Campaigns are reviewed before going live to workers."}
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-fg-muted">{label}</span>
      <span
        className={
          strong
            ? "text-base font-bold text-fg"
            : muted
              ? "text-fg-subtle"
              : "font-medium text-fg"
        }
      >
        {value}
      </span>
    </div>
  );
}
