"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Misc";
import { PlatformChip } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useGetTaskQuery } from "@/redux/features/tasks/tasksApi";
import { useCreateSubmissionMutation } from "@/redux/features/submissions/submissionsApi";
import { useGetSocialAccountsQuery } from "@/redux/features/social/socialApi";
import { fill, t } from "@/lib/i18n/en";
import { formatMoney } from "@/lib/utils";

export default function TaskDetailPage({ params }: PageProps<"/worker/tasks/[id]">) {
  const { id } = use(params);
  const query = useGetTaskQuery(id);
  const { data: social } = useGetSocialAccountsQuery();
  const [submit, { isLoading }] = useCreateSubmissionMutation();
  const toast = useToast();
  const router = useRouter();

  const [opened, setOpened] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async (taskId: string, linkedUrl?: string) => {
    const url = linkedUrl ?? proofUrl.trim();
    if (!url) {
      toast.error("Add your proof link first");
      return;
    }
    try {
      const res = await submit({ taskId, proofUrl: url, proofNote }).unwrap();
      setDone(true);
      toast.success(
        res.status === "approved"
          ? "Subscription confirmed — reward added to your balance"
          : t.worker.submissionSent,
      );
      setTimeout(() => router.push("/worker/submissions"), 1200);
    } catch (e) {
      // "You have already submitted this task" and "No slots left" are both
      // things the worker can act on; a generic failure tells them nothing.
      const message = (e as { data?: { error?: string } })?.data?.error;
      toast.error(message ?? t.common.somethingWrong);
    }
  };

  return (
    <>
      <PageHeader
        title="Task details"
        back={{ href: "/worker/tasks", label: "All tasks" }}
      />

      <QueryBoundary query={query} isEmpty={() => false}>
        {(task) => {
          // A linked account is the proof: the profile link comes from it, so
          // there is nothing to type and nothing to mistype.
          const linked = social?.accounts.find(
            (a) => a.provider === task.platform && a.profileUrl,
          );
          // Checked against their own subscriptions, which needs the full
          // connection — a typed or code-verified handle cannot be asked.
          const needsConnection =
            task.autoCheck &&
            !social?.accounts.some(
              (a) => a.provider === task.platform && a.autoCheckable,
            );
          return (
          <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-4">
              <Card>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <PlatformChip platform={task.platform} type={task.type} />
                      <h2 className="mt-2 text-base font-semibold text-fg">
                        {task.title}
                      </h2>
                      <p className="text-xs text-fg-muted">by {task.buyerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-brand">
                        {formatMoney(task.reward)}
                      </p>
                      <p className="text-[11px] text-fg-subtle">reward</p>
                    </div>
                  </div>

                  <ol className="mt-4 space-y-2">
                    {task.instructions.map((step, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-fg">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-bg-subtle text-[11px] font-bold text-fg-muted">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>

                  <LinkButton
                    href={task.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    variant="outline"
                    fullWidth
                    className="mt-4"
                    iconRight={ExternalLink}
                    onClick={() => setOpened(true)}
                  >
                    {t.worker.openLink}
                  </LinkButton>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title={t.worker.submitProof} />
                <CardBody className="space-y-3">
                  {/* Already theirs. Nothing on this card would do anything,
                      so none of it is shown — a disabled form still reads as
                      an invitation to try. */}
                  {task.alreadySubmitted ? (
                    <>
                      <Alert tone="info" title="You have already done this task">
                        Each task counts once per worker, so there is nothing
                        more to submit here.
                      </Alert>
                      <LinkButton
                        href="/worker/submissions"
                        variant="outline"
                        fullWidth
                        iconRight={ArrowRight}
                      >
                        See your submission
                      </LinkButton>
                      <LinkButton href="/worker/tasks" variant="ghost" fullWidth>
                        Find another task
                      </LinkButton>
                    </>
                  ) : (
                  <>
                  {needsConnection ? (
                    <>
                      <Alert tone="warning" title="Connect your YouTube channel first">
                        This task is checked automatically against your own
                        YouTube subscriptions, so your channel has to be
                        connected before you subscribe. It only takes a moment
                        and you only do it once.
                      </Alert>
                      <LinkButton
                        href="/worker/accounts"
                        fullWidth
                        iconRight={ArrowRight}
                      >
                        Connect YouTube
                      </LinkButton>
                    </>
                  ) : (
                  <>
                  {!opened && (
                    <Alert tone="info">
                      Open the task link first, complete the action, then submit
                      your proof.
                    </Alert>
                  )}
                  {task.autoCheck && linked && (
                    <Alert tone="info">
                      Subscribe while YouTube is signed in to{" "}
                      <span className="font-semibold">{linked.name}</span> —
                      that is the channel we check.
                    </Alert>
                  )}
                  {linked ? (
                    <div className="rounded-lg border border-border bg-bg-subtle p-3">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                        <BadgeCheck size={15} className="text-brand" />
                        Submitting as {linked.name}
                      </p>
                      <a
                        href={linked.profileUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block truncate text-xs font-medium text-brand hover:underline"
                      >
                        {linked.profileUrl}
                      </a>
                      <p className="mt-1 text-[11px] text-fg-subtle">
                        Your proof link comes from your linked account.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Field label={t.worker.proofUrl} required>
                        <Input
                          placeholder="https://facebook.com/yourprofile"
                          value={proofUrl}
                          onChange={(e) => setProofUrl(e.target.value)}
                        />
                      </Field>
                      <Alert tone="info">
                        <a href="/worker/accounts" className="font-semibold underline">
                          Link your account
                        </a>{" "}
                        and your proof link fills itself in from now on.
                      </Alert>
                    </>
                  )}
                  <Field label={t.worker.proofNote}>
                    <Textarea
                      placeholder="e.g. Done from my main account @rakib"
                      value={proofNote}
                      onChange={(e) => setProofNote(e.target.value)}
                    />
                  </Field>
                  <Button
                    fullWidth
                    loading={isLoading}
                    disabled={done}
                    icon={done ? CheckCircle2 : undefined}
                    onClick={() => onSubmit(task.id, linked?.profileUrl ?? undefined)}
                  >
                    {done ? "Submitted" : t.worker.submitProof}
                  </Button>
                  </>
                  )}
                  </>
                  )}
                </CardBody>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardBody className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-fg-muted">Slots left</span>
                    <span className="font-semibold">
                      {task.slotsLeft.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-muted">Hold period</span>
                    <span className="font-semibold">{task.holdDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-muted">Reward</span>
                    <span className="font-semibold text-brand">
                      {formatMoney(task.reward)}
                    </span>
                  </div>
                </CardBody>
              </Card>

              <Alert tone="warning" title="Important">
                <span className="flex gap-2">
                  <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                  {fill(t.worker.holdNotice, { days: task.holdDays })}
                </span>
              </Alert>
            </div>
          </div>
          );
        }}
      </QueryBoundary>
    </>
  );
}
