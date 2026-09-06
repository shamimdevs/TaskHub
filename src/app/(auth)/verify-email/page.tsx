"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Misc";
import { authClient } from "@/lib/auth-client";
import { roleHome } from "@/lib/roles";

function VerifyEmailInner() {
  const router = useRouter();
  const email = useSearchParams().get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResent(false);
    setVerifying(true);
    try {
      const { data, error } = await authClient.emailOtp.verifyEmail({
        email,
        otp: otp.trim(),
      });
      if (error) {
        setError(error.message ?? "That code is wrong or has expired.");
        return;
      }
      // autoSignInAfterVerification is on, so the session already exists.
      const role = (data?.user as { role?: string } | undefined)?.role;
      router.push(roleHome(role));
      router.refresh();
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    if (!email) return;
    setError(null);
    setResending(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (error) {
        setError("Could not send a new code. Try again in a moment.");
        return;
      }
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <div>
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-500/15">
          <ShieldCheck size={26} />
        </span>
        <h1 className="mt-4 text-xl font-bold text-fg">Enter your code</h1>
        <p className="mx-auto mt-1 max-w-xs text-sm text-fg-muted">
          We issued a 6-digit verification code for{" "}
          <span className="font-medium text-fg">
            {email || "your email address"}
          </span>
          .
        </p>
      </div>

      {error && (
        <Alert tone="danger" className="mt-5">
          {error}
        </Alert>
      )}
      {resent && (
        <Alert tone="success" className="mt-5">
          A new code is ready.
        </Alert>
      )}

      <form className="mt-6 space-y-4" onSubmit={verify} noValidate>
        <Field label="Verification code" required>
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
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={verifying}
          disabled={otp.length < 6 || !email}
        >
          Verify and continue
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        <Button
          fullWidth
          variant="outline"
          loading={resending}
          onClick={resend}
          disabled={!email}
        >
          Send a new code
        </Button>
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"
        >
          <ArrowLeft size={15} /> Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-bg-subtle" />}>
      <VerifyEmailInner />
    </Suspense>
  );
}
