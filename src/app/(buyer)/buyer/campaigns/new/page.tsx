import { Suspense } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { CampaignForm } from "@/components/panels/buyer/CampaignForm";

export default function NewCampaignPage() {
  return (
    <>
      <PageHeader
        title="New campaign"
        back={{ href: "/buyer/campaigns", label: "Campaigns" }}
      />
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-xl bg-bg-subtle" />}
      >
        <CampaignForm />
      </Suspense>
    </>
  );
}
