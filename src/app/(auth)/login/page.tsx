import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/panels/auth/AuthForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFormFallback />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}

function AuthFormFallback() {
  return <div className="h-96 animate-pulse rounded-xl bg-bg-subtle" />;
}
