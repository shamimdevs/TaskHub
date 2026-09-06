"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Misc";
import { authClient } from "@/lib/auth-client";

function ResetForm() {
  const router = useRouter();
  const emailFromLink = useSearchParams().get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await authClient.emailOtp.resetPassword({
        email,
        otp: otp.trim(),
        password,
      });
      if (error) {
        setError(error.message ?? "That code is wrong or has expired.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1400);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-fg">Choose a new password</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Enter the 6-digit code we issued, then pick something you haven&rsquo;t
        used here before.
      </p>

      {done ? (
        <Alert tone="success" className="mt-6">
          Password updated. Redirecting you to sign in…
        </Alert>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Email" required>
            <Input
              icon={Mail}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              defaultValue={emailFromLink}
              placeholder="you@gmail.com"
              required
            />
          </Field>
          <Field label="Reset code" required>
            <Input
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="text-center text-lg font-bold tracking-[0.5em]"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
            />
          </Field>
          <Field label="New password" required hint="At least 8 characters">
            <Input
              icon={Lock}
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </Field>
          <Field label="Confirm new password" required>
            <Input
              icon={Lock}
              name="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </Field>
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            disabled={otp.length < 6}
          >
            Update password
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-xs text-fg-subtle">
        No code yet?{" "}
        <Link href="/forgot-password" className="font-semibold text-brand hover:underline">
          Request one
        </Link>
        .
      </p>

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={15} /> Back to sign in
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-bg-subtle" />}>
      <ResetForm />
    </Suspense>
  );
}
