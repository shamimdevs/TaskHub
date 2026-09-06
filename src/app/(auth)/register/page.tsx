import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/panels/auth/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-bg-subtle" />}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
