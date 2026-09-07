import { Suspense } from "react";
import { ConnectedAccounts } from "@/components/panels/worker/ConnectedAccounts";

export const metadata = {
  title: "Connected accounts",
};

export default function Page() {
  return (
    <Suspense
      fallback={<div className="h-96 animate-pulse rounded-xl bg-bg-subtle" />}
    >
      <ConnectedAccounts />
    </Suspense>
  );
}
