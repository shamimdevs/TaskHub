"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Misc";
import { t } from "@/lib/i18n/en";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <h1 className="text-xl font-bold text-fg">{t.auth.resetTitle}</h1>
      <p className="mt-1 text-sm text-fg-muted">{t.auth.resetSubtitle}</p>

      {sent ? (
        <Alert tone="success" className="mt-6">
          If an account exists for that email, a reset link is on its way.
        </Alert>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              setSent(true);
            }, 500);
          }}
        >
          <Field label={t.auth.email} required>
            <Input icon={Mail} type="email" placeholder="you@gmail.com" required />
          </Field>
          <Button type="submit" fullWidth size="lg" loading={loading}>
            {t.auth.sendLink}
          </Button>
        </form>
      )}

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={15} /> Back to sign in
      </Link>
    </div>
  );
}
