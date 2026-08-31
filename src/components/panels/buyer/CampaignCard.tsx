import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Campaign } from "@/types";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Misc";
import { CampaignStatusBadge, PlatformChip } from "@/components/ui/StatusBadge";
import { formatMoney, formatNumber, pct } from "@/lib/utils";

export function CampaignCard({ c }: { c: Campaign }) {
  const progress = pct(c.delivered, c.quantity);
  return (
    <Card interactive className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <PlatformChip platform={c.platform} type={c.type} />
          <h3 className="mt-2 truncate text-sm font-semibold text-fg">{c.title}</h3>
        </div>
        <CampaignStatusBadge status={c.status} />
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-fg-muted">
          <span>
            {formatNumber(c.delivered)} / {formatNumber(c.quantity)} delivered
          </span>
          <span className="font-semibold text-fg">{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-fg-muted">
          Spend{" "}
          <span className="font-semibold text-fg">{formatMoney(c.totalCost)}</span>
        </span>
        <Link
          href={`/buyer/campaigns/${c.id}`}
          className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
        >
          Details <ArrowRight size={13} />
        </Link>
      </div>
    </Card>
  );
}
