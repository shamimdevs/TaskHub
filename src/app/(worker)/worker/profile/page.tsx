import { Suspense } from "react";
import { ProfilePanel } from "@/components/panels/ProfilePanel";

export default function Page() {
  return (
    <Suspense
      fallback={<div className="h-96 animate-pulse rounded-xl bg-bg-subtle" />}
    >
      <ProfilePanel role="worker" />
    </Suspense>
  );
}
