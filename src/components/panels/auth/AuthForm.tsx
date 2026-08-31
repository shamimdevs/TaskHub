"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, Phone, User } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { useAppDispatch } from "@/redux/hooks";
import { setRole } from "@/redux/features/session/sessionSlice";
import { ROLE_META } from "@/lib/nav";
import { t } from "@/lib/i18n/en";
import type { Role } from "@/types";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const toast = useToast();
  const [role, setLocalRole] = useState<Exclude<Role, "admin">>("worker");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // No real auth in this pass — route into the chosen panel.
    setTimeout(() => {
      dispatch(setRole(role));
      toast.success(
        mode === "login" ? "Welcome back" : "Account created",
        `Signed in as ${ROLE_META[role].label}`,
      );
      router.push(ROLE_META[role].home);
    }, 500);
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-fg">
        {mode === "login" ? t.auth.loginTitle : t.auth.registerTitle}
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        {mode === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "register" && (
          <Field label={t.auth.iWantTo}>
            <SegmentedControl<typeof role>
              value={role}
              onChange={setLocalRole}
              segments={[
                { value: "worker", label: t.auth.roleWorker, hint: t.auth.roleWorkerHint },
                { value: "buyer", label: t.auth.roleBuyer, hint: t.auth.roleBuyerHint },
              ]}
            />
          </Field>
        )}

        {mode === "register" && (
          <Field label={t.auth.name} required>
            <Input icon={User} placeholder="Rakib Hasan" required />
          </Field>
        )}

        <Field label={t.auth.email} required>
          <Input icon={Mail} type="email" placeholder="you@gmail.com" required />
        </Field>

        {mode === "register" && (
          <Field label={t.auth.phone} required>
            <Input icon={Phone} inputMode="numeric" placeholder="01XXXXXXXXX" required />
          </Field>
        )}

        <Field
          label={t.auth.password}
          required
          hint={mode === "login" ? undefined : "At least 8 characters"}
        >
          <Input icon={Lock} type="password" placeholder="••••••••" required />
        </Field>

        {mode === "register" && (
          <Field label={t.auth.referral}>
            <Input placeholder="RAKIB123" />
          </Field>
        )}

        {mode === "login" && (
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-brand hover:underline"
            >
              {t.auth.forgot}
            </Link>
          </div>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading} iconRight={ArrowRight}>
          {mode === "login" ? t.auth.signIn : t.auth.signUp}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-fg-subtle">{t.auth.agree}</p>

      <p className="mt-6 text-center text-sm text-fg-muted">
        {mode === "login" ? t.auth.noAccount : t.auth.haveAccount}{" "}
        <Link
          href={mode === "login" ? "/register" : "/login"}
          className="font-semibold text-brand hover:underline"
        >
          {mode === "login" ? t.auth.signUp : t.auth.signIn}
        </Link>
      </p>
    </div>
  );
}
