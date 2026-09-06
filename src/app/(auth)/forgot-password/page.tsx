"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Misc";
import { authClient } from "@/lib/auth-client";
import { t } from "@/lib/i18n/en";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    setLoading(true);
    try {
      const { error } = await authClient.forgetPassword.emailOtp({ email });
      // Never reveal whether the account exists — only a real outage stops here.
      if (error && error.status && error.status >= 500) {
        setError("Something went wrong. Please try again.");
        return;
      }
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-fg">{t.auth.resetTitle}</h1>
      <p className="mt-1 text-sm text-fg-muted">{t.auth.resetSubtitle}</p>

      {error && (
        <Alert tone="danger" className="mt-6">
          {error}
        </Alert>
      )}

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <Field label={t.auth.email} required>
          <Input
            icon={Mail}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@gmail.com"
            required
          />
        </Field>
        <Button type="submit" fullWidth size="lg" loading={loading}>
          {t.auth.sendCode}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={15} /> Back to sign in
      </Link>
    </div>
  );
}
