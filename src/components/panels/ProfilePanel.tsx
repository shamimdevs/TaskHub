"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgeCheck,
  Camera,
  ChevronRight,
  Link2,
  LogOut,
  Mail,
  Phone,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Misc";
import { Avatar } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import { useGetMeQuery } from "@/redux/features/session/sessionApi";
import { authClient } from "@/lib/auth-client";
import {
  ACCEPTED_IMAGE_TYPES,
  UploadError,
  uploadImage,
} from "@/lib/imagekit-client";
import {
  changePasswordSchema,
  setPasswordSchema,
  type ChangePasswordValues,
  type SetPasswordValues,
} from "@/lib/forms";
import type { Role } from "@/types";
import { formatDate } from "@/lib/utils";

export function ProfilePanel({ role }: { role: Role }) {
  const { data: me, refetch } = useGetMeQuery();
  const toast = useToast();
  const router = useRouter();

  const [savingProfile, setSavingProfile] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const name = me?.name ?? "TaskHub user";
  const banned = me?.status === "banned";
  const canUpload = Boolean(me?.canUploadImages);

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

  /** Straight to ImageKit, then the returned link is saved on the account. */
  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Clear it now, so picking the same file again after a failure still fires.
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      const { error } = await authClient.updateUser({ image: url });
      if (error) {
        toast.error("Could not save the photo", error.message ?? "Try again.");
        return;
      }
      toast.success("Photo updated");
      refetch();
    } catch (err) {
      toast.error(
        "Upload failed",
        err instanceof UploadError ? err.message : "Try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    setUploading(true);
    try {
      // The file stays in ImageKit; the account simply stops pointing at it.
      const { error } = await authClient.updateUser({ image: "" });
      if (error) {
        toast.error("Could not remove the photo");
        return;
      }
      toast.success("Photo removed");
      refetch();
    } finally {
      setUploading(false);
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
              <div className="relative shrink-0">
                <Avatar name={name} src={me?.avatarUrl} size={64} />
                {canUpload && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    aria-label="Change profile photo"
                    className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-fg-muted shadow-soft transition-colors hover:text-fg disabled:opacity-60"
                  >
                    <Camera size={14} />
                  </button>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-base font-semibold text-fg">{name}</p>
                  {me?.emailVerified && <BadgeCheck size={16} className="shrink-0 text-brand" />}
                </div>
                <p className="truncate text-sm text-fg-muted">{me?.email}</p>
                <p className="mt-1 text-[11px] text-fg-subtle">
                  Member since {me ? formatDate(me.createdAt) : "—"}
                </p>

                {canUpload && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="font-semibold text-brand hover:underline disabled:opacity-60"
                    >
                      {uploading
                        ? "Uploading…"
                        : me?.avatarUrl
                          ? "Change photo"
                          : "Upload a photo"}
                    </button>
                    {me?.avatarUrl && !uploading && (
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="text-fg-subtle hover:text-danger"
                      >
                        Remove
                      </button>
                    )}
                    <span className="text-fg-subtle">JPG, PNG or WebP · up to 5 MB</span>
                  </div>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                onChange={onPickPhoto}
                className="hidden"
              />
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
              title={me && !me.hasPassword ? "Set a password" : "Change password"}
              description={
                me && !me.hasPassword
                  ? "You signed up with Google. Add a password and you can sign in either way."
                  : "Use at least 8 characters"
              }
            />
            <CardBody>
              {me && !me.hasPassword ? (
                <SetPasswordForm onDone={refetch} />
              ) : (
                <ChangePasswordForm />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          {role === "worker" && (
            <Card>
              <CardBody className="p-0">
                <Link
                  href="/worker/accounts"
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-bg-subtle"
                >
                  <Link2 size={18} className="shrink-0 text-fg-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-fg">
                      Connected accounts
                    </span>
                    <span className="block text-xs text-fg-muted">
                      Link the accounts your task proofs are checked against
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-fg-subtle" />
                </Link>
              </CardBody>
            </Card>
          )}

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

/**
 * Google-only accounts have no password to prove themselves with, so this asks
 * for the new one twice and nothing else — the live session is the proof.
 */
function SetPasswordForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [failed, setFailed] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    mode: "onTouched",
    defaultValues: { next: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailed(null);
    const res = await fetch("/api/session/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newPassword: values.next }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setFailed(body?.error ?? "Could not set the password.");
      return;
    }
    toast.success("Password set", "You can now sign in with your email too.");
    reset();
    onDone();
  });

  return (
    <form className="space-y-3" onSubmit={onSubmit} noValidate>
      {failed && <Alert tone="danger">{failed}</Alert>}
      <Field label="New password" required error={errors.next?.message}>
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          invalid={Boolean(errors.next)}
          {...register("next")}
        />
      </Field>
      <Field label="Confirm password" required error={errors.confirm?.message}>
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          invalid={Boolean(errors.confirm)}
          {...register("confirm")}
        />
      </Field>
      <Button type="submit" loading={isSubmitting}>
        Set password
      </Button>
    </form>
  );
}

function ChangePasswordForm() {
  const toast = useToast();
  const [failed, setFailed] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    defaultValues: { current: "", next: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailed(null);
    const { error } = await authClient.changePassword({
      currentPassword: values.current,
      newPassword: values.next,
      revokeOtherSessions: true,
    });
    if (error) {
      // The one thing the server knows and the schema cannot.
      if (error.code === "INVALID_PASSWORD") {
        setError("current", { message: "That is not your current password." });
        return;
      }
      setFailed(error.message ?? "Could not update password.");
      return;
    }
    toast.success("Password updated", "Other devices have been signed out.");
    reset();
  });

  return (
    <form className="space-y-3" onSubmit={onSubmit} noValidate>
      {failed && <Alert tone="danger">{failed}</Alert>}
      <Field label="Current password" required error={errors.current?.message}>
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          invalid={Boolean(errors.current)}
          {...register("current")}
        />
      </Field>
      <Field label="New password" required error={errors.next?.message}>
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          invalid={Boolean(errors.next)}
          {...register("next")}
        />
      </Field>
      <Field label="Confirm new password" required error={errors.confirm?.message}>
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          invalid={Boolean(errors.confirm)}
          {...register("confirm")}
        />
      </Field>
      <Button type="submit" variant="outline" loading={isSubmitting}>
        Update password
      </Button>
    </form>
  );
}
