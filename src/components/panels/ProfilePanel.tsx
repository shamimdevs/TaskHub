"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, LogOut, Mail, Phone, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Misc";
import { Avatar } from "@/components/ui/Misc";
import { ConnectedAccounts } from "@/components/panels/worker/ConnectedAccounts";
import { useToast } from "@/components/ui/Toast";
import { useGetMeQuery } from "@/redux/features/session/sessionApi";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/types";
import { formatDate } from "@/lib/utils";

export function ProfilePanel({ role }: { role: Role }) {
  const { data: me, refetch } = useGetMeQuery();
  const toast = useToast();
  const router = useRouter();

  const [savingProfile, setSavingProfile] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const name = me?.name ?? "TaskHub user";
  const banned = me?.status === "banned";

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSavingProfile(true);
    try {
      const { error } = await authClient.updateUser({
        name: String(fd.get("name") || "").trim(),
        phone: String(fd.get("phone") || "").trim(),
      } as Parameters<typeof authClient.updateUser>[0]);
      if (error) {
        toast.error("Could not save", error.message ?? "Try again.");
        return;
      }
      toast.success("Profile saved");
      refetch();
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwError(null);
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get("current") || "");
    const newPassword = String(fd.get("next") || "");
    const confirm = String(fd.get("confirm") || "");
    if (newPassword !== confirm) {
      setPwError("New passwords do not match.");
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        setPwError(error.message ?? "Could not update password.");
        return;
      }
      toast.success("Password updated");
      (e.target as HTMLFormElement).reset();
    } finally {
      setPwLoading(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <>
      <PageHeader title="Profile" description="Manage your account" />

      {banned && (
        <Alert tone="danger" title="Account banned" className="mb-4">
          <span className="flex gap-2">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            {me?.banReason ?? "Contact support for details."}
          </span>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Card>
            <CardBody className="flex items-center gap-4">
              <Avatar name={name} src={me?.avatarUrl} size={64} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-base font-semibold text-fg">{name}</p>
                  {me?.emailVerified && <BadgeCheck size={16} className="shrink-0 text-brand" />}
                </div>
                <p className="truncate text-sm text-fg-muted">{me?.email}</p>
                <p className="mt-1 text-[11px] text-fg-subtle">
                  Member since {me ? formatDate(me.createdAt) : "—"}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Account details" />
            <CardBody>
              <form className="space-y-3" onSubmit={saveProfile}>
                <Field label="Full name">
                  <Input name="name" defaultValue={name} autoComplete="name" required minLength={2} />
                </Field>
                <Field label="Email" hint="Contact support to change your email.">
                  <Input icon={Mail} defaultValue={me?.email} type="email" disabled />
                </Field>
                <Field label="Phone">
                  <Input
                    icon={Phone}
                    name="phone"
                    defaultValue={me?.phone}
                    type="tel"
                    inputMode="numeric"
                  />
                </Field>
                <Button type="submit" loading={savingProfile}>
                  Save changes
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Change password"
              description={me && !me.hasPassword ? undefined : "Use at least 8 characters"}
            />
            <CardBody>
              {me && !me.hasPassword ? (
                <p className="text-sm text-fg-muted">
                  You sign in with Google, so there&rsquo;s no password to change.
                </p>
              ) : (
                <form className="space-y-3" onSubmit={changePassword}>
                  {pwError && <Alert tone="danger">{pwError}</Alert>}
                  <Field label="Current password">
                    <Input
                      name="current"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      required
                    />
                  </Field>
                  <Field label="New password">
                    <Input
                      name="next"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                  </Field>
                  <Field label="Confirm new password">
                    <Input
                      name="confirm"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                  </Field>
                  <Button type="submit" variant="outline" loading={pwLoading}>
                    Update password
                  </Button>
                </form>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          {role === "worker" && <ConnectedAccounts />}

          <Card>
            <CardBody>
              <Button
                variant="ghost"
                fullWidth
                icon={LogOut}
                loading={signingOut}
                className="text-danger hover:bg-danger-soft"
                onClick={signOut}
              >
                Sign out
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
