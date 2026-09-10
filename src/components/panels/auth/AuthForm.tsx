"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, Mail, User } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Alert } from "@/components/ui/Misc";
import { authClient } from "@/lib/auth-client";
import { authSchema, type AuthValues } from "@/lib/forms";
import { roleHome } from "@/lib/roles";
import { t } from "@/lib/i18n/en";

type SignupRole = "worker" | "buyer";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const nextUrl = params.get("next");

  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login and register share one value shape; only the rules differ, so the
  // resolver is the thing that changes with the mode.
  const resolver = useMemo(
    () => zodResolver(authSchema(mode)) as Resolver<AuthValues>,
    [mode],
  );

  const {
    register,
    handleSubmit,
    setValue,
    setError: setFieldError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AuthValues>({
    resolver,
    // Nag only after someone has left a field, then correct them as they fix it.
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "worker",
      referral: params.get("ref") ?? "",
    },
  });

  // useWatch rather than watch(): it subscribes to this one field instead of
  // re-rendering the form on every keystroke.
  const role = (useWatch({ control, name: "role" }) ?? "worker") as SignupRole;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);

    if (mode === "register") {
      const { error } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name!,
        // additional fields (declared in src/lib/auth.ts)
        role,
        referredByCode: values.referral || undefined,
        callbackURL: nextUrl ?? roleHome(role),
      } as Parameters<typeof authClient.signUp.email>[0]);

      if (error) {
        // Point at the field when the server knows which one is at fault.
        if (error.code === "USER_ALREADY_EXISTS") {
          setFieldError("email", {
            message: "That email already has an account.",
          });
          return;
        }
        setError(error.message ?? "Could not create your account.");
        return;
      }
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
      return;
    }

    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: true,
      callbackURL: nextUrl ?? undefined,
    });

    if (error) {
      if (error.code === "EMAIL_NOT_VERIFIED") {
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }
      setError(error.message ?? "Invalid email or password.");
      return;
    }

    const userRole = (data?.user as { role?: string } | undefined)?.role;
    router.push(nextUrl ?? roleHome(userRole));
    router.refresh();
  });

  async function onGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        // Google sends no role, so land on the setup step: it asks first-time
        // accounts and forwards everyone else to their own dashboard.
        callbackURL: nextUrl ?? "/setup-role",
        errorCallbackURL: "/login",
      });
      if (error) {
        setError(error.message ?? "Google sign-in is unavailable right now.");
        setGoogleLoading(false);
      }
    } catch {
      setError("Google sign-in is unavailable right now.");
      setGoogleLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-fg">
        {mode === "login" ? t.auth.loginTitle : t.auth.registerTitle}
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        {mode === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle}
      </p>

      {error && (
        <Alert tone="danger" className="mt-4">
          {error}
        </Alert>
      )}

      <button
        type="button"
        onClick={onGoogle}
        disabled={googleLoading || isSubmitting}
        className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-lg border border-border-strong bg-card px-4 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-60"
      >
        <GoogleGlyph />
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-fg-subtle">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* noValidate: the schema owns the messages, not the browser. */}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {mode === "register" && (
          <Field label={t.auth.iWantTo} error={errors.role?.message}>
            <SegmentedControl<SignupRole>
              value={role}
              onChange={(v) => setValue("role", v, { shouldValidate: true })}
              segments={[
                { value: "worker", label: t.auth.roleWorker, hint: t.auth.roleWorkerHint },
                { value: "buyer", label: t.auth.roleBuyer, hint: t.auth.roleBuyerHint },
              ]}
            />
          </Field>
        )}

        {mode === "register" && (
          <Field label={t.auth.name} required error={errors.name?.message}>
            <Input
              icon={User}
              autoComplete="name"
              placeholder="Rakib Hasan"
              invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </Field>
        )}

        <Field label={t.auth.email} required error={errors.email?.message}>
          <Input
            icon={Mail}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@gmail.com"
            invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </Field>

        <Field
          label={t.auth.password}
          required
          error={errors.password?.message}
          hint={mode === "login" ? undefined : "At least 8 characters"}
        >
          <Input
            icon={Lock}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••"
            invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </Field>

        {mode === "register" && (
          <Field label={t.auth.referral} error={errors.referral?.message}>
            <Input
              autoCapitalize="characters"
              placeholder="RAKIB123"
              invalid={Boolean(errors.referral)}
              {...register("referral")}
            />
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

        <Button type="submit" fullWidth size="lg" loading={isSubmitting} iconRight={ArrowRight}>
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

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
