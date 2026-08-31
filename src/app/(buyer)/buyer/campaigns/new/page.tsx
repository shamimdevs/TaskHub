import { PageHeader } from "@/components/layout/AppShell";
import { CampaignForm } from "@/components/panels/buyer/CampaignForm";

export default function NewCampaignPage() {
  return (
    <>
      <PageHeader
        title="New campaign"
        back={{ href: "/buyer/campaigns", label: "Campaigns" }}
      />
      <CampaignForm />
    </>
  );
}
