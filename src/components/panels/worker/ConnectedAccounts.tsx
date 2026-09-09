"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  RefreshCw,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import {
  useCheckSocialAccountMutation,
  useClaimSocialAccountMutation,
  useGetSocialAccountsQuery,
  useSetSocialProfileUrlMutation,
  useUnlinkSocialAccountMutation,
} from "@/redux/features/social/socialApi";
import type { Platform, SocialAccount } from "@/types";

/**
 * Each provider, and — the part that matters — how honestly it can be checked.
 */
const PROVIDERS: {
  provider: Platform;
  label: string;
  icon: typeof Users;
  connectPath: string;
  statusKey: string;
  /** What verification actually does here, in the worker's own terms. */
  checkNote: string;
  /** True when the platform can be asked about this worker directly. */
  direct: boolean;
  /** Where the one-time code goes, for the providers that can be code-checked. */
  codeLocation?: string;
}[] = [
  {
    provider: "youtube",
    label: "YouTube",
    icon: Video,
    connectPath: "/api/integrations/youtube/connect",
    statusKey: "yt",
    checkNote:
      "We check your subscriptions directly, so subscribe tasks are approved within minutes.",
    direct: true,
    codeLocation: "your channel's About description",
  },
  {
    provider: "facebook",
    label: "Facebook",
    icon: Users,
    connectPath: "/api/integrations/facebook/connect?as=profile",
    statusKey: "fb",
    checkNote:
      "Facebook will not say who follows a page, so follows are confirmed by the page's follower count.",
    direct: false,
  },
  {
    provider: "instagram",
    label: "Instagram",
    icon: Camera,
    connectPath: "/api/integrations/instagram/connect",
    statusKey: "ig",
    checkNote:
      "Instagram will not say who follows an account, so follows are confirmed by the account's follower count.",
    direct: false,
  },
];

/** Callback outcomes worth a word, keyed by the status each provider returns. */
const MESSAGES: Record<string, { tone: "success" | "danger" | "warning"; text: string }> = {
  linked: { tone: "success", text: "Account linked and verified." },
  linked_no_refresh: {
    tone: "warning",
    text: "Linked, but we did not get long-term access. Reconnect to keep your proofs automatic.",
  },
  taken: {
    tone: "danger",
    text: "That account is already linked to another TaskHub worker.",
  },
  no_channel: {
    tone: "danger",
    text: "That Google account has no YouTube channel yet. Create one, then try again.",
  },
  cancelled: { tone: "warning", text: "You cancelled before finishing." },
  failed: { tone: "danger", text: "Could not link the account. Please try again." },
  invalid_state: {
    tone: "danger",
    text: "That link attempt expired. Please try again.",
  },
};

/**
 * A worker's linked accounts. Linking is what makes a proof mean something:
 * the profile link on every submission comes from the connected account
 * instead of being typed, and one social account can only ever belong to one
 * TaskHub worker.
 *
 * Two things this screen refuses to do. It never calls an account verified
 * when nothing has actually proved it — the badge distinguishes a real link
 * from a self-declared handle. And it never leaves someone stranded on
 * "unverified" with nowhere to go: if a claim can be settled by a code, the
 * code is right there and the check runs on its own; if it cannot be settled
 * on this server at all, it says so instead of implying the worker is at
 * fault.
 */
export function ConnectedAccounts() {
  const { data, isLoading } = useGetSocialAccountsQuery();
  const [setUrl, { isLoading: saving }] = useSetSocialProfileUrlMutation();
  const [claim, { isLoading: claiming }] = useClaimSocialAccountMutation();
  const [check, { isLoading: checking }] = useCheckSocialAccountMutation();
  const [unlink] = useUnlinkSocialAccountMutation();
  const toast = useToast();
  const params = useSearchParams();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draft = (key: string) => drafts[key] ?? "";
  const setDraft = (key: string, value: string) =>
    setDrafts((d) => ({ ...d, [key]: value }));

  /** Which account's link is open for editing — one at a time. */
  const [editing, setEditing] = useState<string | null>(null);

  const accounts = data?.accounts ?? [];
  const linked = (p: Platform) => accounts.find((a) => a.provider === p);
  const canLink = (p: Platform) => data?.available?.[p] === true;
  const canClaim = (p: Platform) => data?.claimable?.includes(p) ?? false;
  const canCodeVerify = (p: Platform) =>
    data?.codeVerifiable?.includes(p) ?? false;

  const saveUrl = async (id: string) => {
    try {
      const account = await setUrl({ id, profileUrl: draft(id).trim() }).unwrap();
      setDraft(id, "");
      setEditing(null);
      // The server decides what a save costs: filling in a link the platform
      // withheld keeps the verification, moving one to a different profile
      // does not. Say which happened rather than always claiming success.
      toast.success(
        account.verified
          ? "Profile link saved"
          : account.verifyCode
            ? "Link changed — add the new code to verify it again"
            : "Link changed — this account needs verifying again",
      );
    } catch (e) {
      const message = (e as { data?: { error?: string } })?.data?.error;
      toast.error(message ?? "That does not look like a valid link");
    }
  };

  const saveHandle = async (provider: Platform) => {
    try {
      const account = await claim({
        provider,
        username: draft(provider).trim(),
      }).unwrap();
      setDraft(provider, "");
      toast.success(
        account.verified
          ? "Account verified"
          : account.verifyCode
            ? "Saved — add the code to finish verifying"
            : "Username saved",
      );
    } catch (e) {
      const message = (e as { data?: { error?: string } })?.data?.error;
      toast.error(message ?? "Could not save that username");
    }
  };

  const runCheck = async (id: string) => {
    try {
      const res = await check(id).unwrap();
      if (res.verified) toast.success("Verified — thanks!");
      else if (res.throttled) toast.error("Just checked — give it a moment");
      else toast.error(res.account.lastError ?? "Code not found yet");
    } catch {
      toast.error("Could not run the check");
    }
  };

  const drop = async (id: string) => {
    try {
      await unlink(id).unwrap();
      toast.success("Account unlinked");
    } catch {
      toast.error("Could not unlink");
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy — select it by hand");
    }
  };

  /** The badge, and it never overstates what we actually know. */
  const badge = (account: SocialAccount) => {
    if (account.verified) return <Badge tone="success">Verified</Badge>;
    if (account.verifyCode) return <Badge tone="warning">Verifying…</Badge>;
    return <Badge tone="neutral">Self-declared</Badge>;
  };

  return (
    <>
      <PageHeader
        title="Connected accounts"
        description="The accounts your task proofs are checked against"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-3">
          {PROVIDERS.map((p) => {
            const status = params.get(p.statusKey);
            const message = status ? MESSAGES[status] : undefined;
            const account = linked(p.provider);
            const oauth = canLink(p.provider);

            return (
              <Card key={p.provider}>
                <CardBody className="space-y-2.5">
                  {message && (
                    <Alert tone={message.tone}>
                      {p.label}: {message.text}
                    </Alert>
                  )}

                  <div className="flex items-center gap-3">
                    <p.icon size={20} className="shrink-0 text-fg-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg">{p.label}</p>
                      <p className="truncate text-xs text-fg-muted">
                        {account ? account.name : "Not connected"}
                      </p>
                    </div>

                    {account ? (
                      badge(account)
                    ) : oauth ? (
                      <a
                        href={p.connectPath}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle"
                      >
                        <Link2 size={13} /> Connect
                      </a>
                    ) : null}
                  </div>

                  {/* How this platform is actually checked. */}
                  <p className="flex items-start gap-1.5 text-[11px] leading-snug text-fg-subtle">
                    {p.direct ? (
                      <Zap size={12} className="mt-0.5 shrink-0 text-brand" />
                    ) : (
                      <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
                    )}
                    {p.checkNote}
                  </p>

                  {account && (
                    <div className="space-y-2.5 border-t border-border pt-2.5">
                      {/* A claim that can be settled: show the code and get
                          out of the way. The cron checks it either way. */}
                      {account.verifyCode && p.codeLocation && (
                        <div className="rounded-lg border border-warning/25 bg-warning-soft/40 p-2.5">
                          <p className="text-xs font-semibold text-fg">
                            Finish verifying
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">
                            Paste this code anywhere in {p.codeLocation}. We
                            check every few minutes and verify you
                            automatically — you can close this page.
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <code className="flex-1 truncate rounded-md bg-card px-2 py-1.5 font-mono text-xs font-semibold text-fg ring-1 ring-inset ring-border">
                              {account.verifyCode}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              icon={Copy}
                              onClick={() => copy(account.verifyCode!)}
                            >
                              Copy
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={RefreshCw}
                            className="mt-1.5"
                            loading={checking}
                            onClick={() => runCheck(account.id)}
                          >
                            Check now
                          </Button>
                        </div>
                      )}

                      {/* Self-declared with no way to settle it here. Say so,
                          rather than leaving a badge that reads like a fault. */}
                      {!account.verified &&
                        !account.verifyCode &&
                        !canCodeVerify(p.provider) && (
                          <Alert tone="info">
                            {oauth ? (
                              <>
                                Connect with {p.label} below to verify this
                                account.
                              </>
                            ) : (
                              <>
                                {p.label} cannot confirm an account until this
                                server has its app credentials, so this stays
                                self-declared. It still reserves the handle:
                                nobody else can submit with it.
                              </>
                            )}
                          </Alert>
                        )}

                      {/* Verified identity is not the same as a checkable
                          one. A code proves the channel is theirs; only the
                          full connection lets us read their subscriptions. */}
                      {p.direct && account.verified && !account.autoCheckable && (
                        <Alert tone="warning">
                          {oauth ? (
                            <>
                              This confirms the channel is yours, but subscribe
                              tasks need the full {p.label} connection so we can
                              read your subscriptions. Connect below to take
                              them.
                            </>
                          ) : (
                            <>
                              This confirms the channel is yours. Subscribe
                              tasks additionally need the full {p.label}
                              connection, which is not set up on this server
                              yet.
                            </>
                          )}
                        </Alert>
                      )}

                      {account.lastError && (
                        <p className="flex items-start gap-1.5 text-xs text-warning">
                          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                          {account.lastError}
                        </p>
                      )}

                      {account.profileUrl && editing !== account.id ? (
                        <div className="space-y-1.5">
                          <a
                            href={account.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 truncate text-xs font-medium text-brand hover:underline"
                          >
                            <ExternalLink size={12} className="shrink-0" />
                            {account.profileUrl}
                          </a>
                          <button
                            onClick={() => {
                              setDraft(account.id, account.profileUrl!);
                              setEditing(account.id);
                            }}
                            className="text-xs font-semibold text-fg-muted hover:underline"
                          >
                            Change link
                          </button>
                        </div>
                      ) : (
                        <Field
                          label={
                            account.profileUrl
                              ? "Change your profile link"
                              : "Your profile link"
                          }
                          hint={
                            account.profileUrl
                              ? "Point it at a different profile and this account starts over as unverified."
                              : `${p.label} did not share it, so add it once — every proof will use it from now on.`
                          }
                        >
                          {/* Moving the link is moving the account. Say so
                              before the save, not in a toast afterwards. */}
                          {account.profileUrl && account.verified && (
                            <Alert tone="warning">
                              Your proofs are checked against this link, so a
                              different one has to be verified again —{" "}
                              {canCodeVerify(p.provider)
                                ? "you will get a new code to put on the new profile."
                                : oauth
                                  ? `you will need to reconnect with ${p.label}.`
                                  : `${p.label} cannot confirm it here, so it will stay self-declared.`}
                            </Alert>
                          )}
                          <Input
                            placeholder={`https://${p.provider}.com/yourprofile`}
                            value={draft(account.id)}
                            onChange={(e) => setDraft(account.id, e.target.value)}
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              size="sm"
                              loading={saving}
                              disabled={!draft(account.id).trim()}
                              onClick={() => saveUrl(account.id)}
                            >
                              Save link
                            </Button>
                            {account.profileUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setDraft(account.id, "");
                                  setEditing(null);
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </Field>
                      )}

                      <div className="flex items-center gap-3">
                        {!account.verified && oauth && (
                          <a
                            href={p.connectPath}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                          >
                            <Link2 size={12} /> Verify with {p.label}
                          </a>
                        )}
                        <button
                          onClick={() => drop(account.id)}
                          className="text-xs font-semibold text-danger hover:underline"
                        >
                          Unlink
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Nothing connected yet: OAuth if we can, handle if we cannot. */}
                  {!account && canClaim(p.provider) && (
                    <div className="border-t border-border pt-2.5">
                      <Field
                        label={
                          oauth
                            ? `Or add your ${p.label} username`
                            : `Add your ${p.label} username`
                        }
                        hint={
                          canCodeVerify(p.provider)
                            ? `We will give you a code to put in ${p.codeLocation}, then verify you automatically.`
                            : "This reserves the account so nobody else can submit with it."
                        }
                      >
                        <Input
                          placeholder="@yourusername"
                          value={draft(p.provider)}
                          onChange={(e) => setDraft(p.provider, e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-2"
                          loading={claiming}
                          disabled={!draft(p.provider).trim()}
                          onClick={() => saveHandle(p.provider)}
                        >
                          Save username
                        </Button>
                      </Field>
                    </div>
                  )}

                  {!account && !oauth && !canClaim(p.provider) && (
                    <Alert tone="info">
                      {p.label} linking is not configured on this server yet.
                    </Alert>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>

        <Card className="lg:sticky lg:top-20">
          <CardHeader title="Why this matters" />
          <CardBody className="space-y-2.5 text-xs leading-relaxed text-fg-muted">
            <p>
              Your linked account is what a proof is checked against. The
              profile link on every submission comes from it, so there is
              nothing to type and nothing to get wrong.
            </p>
            <p>
              One account belongs to one worker. That is what stops the same
              profile being used to claim the same task twice.
            </p>
            <p>
              <span className="font-semibold text-fg">Verified</span> means the
              platform confirmed the account, or you proved it with a code.{" "}
              <span className="font-semibold text-fg">Self-declared</span> means
              you told us the handle and nothing has checked it — it still
              reserves the account for you.
            </p>
            <p>
              Because the link is what gets checked, changing it to a different
              profile sets the account back to unverified and it has to be
              verified again. Fixing a link the platform never gave us in the
              first place does not.
            </p>
            {!isLoading && !PROVIDERS.some((p) => canLink(p.provider)) && (
              <Alert tone="info">
                No provider is set up for one-click linking on this server yet,
                so accounts are added by username.
              </Alert>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
