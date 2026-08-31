import { db, json, tick } from "@/app/api/_data/db";
import type { CampaignStatus } from "@/types";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/campaigns/[id]">,
) {
  await tick();
  const { id } = await ctx.params;
  const campaign = db.campaigns.find((c) => c.id === id);
  if (!campaign) return json({ error: "Not found" }, { status: 404 });
  return json(campaign);
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/campaigns/[id]">,
) {
  await tick();
  const { id } = await ctx.params;
  const { status } = (await req.json()) as { status: CampaignStatus };
  const campaign = db.campaigns.find((c) => c.id === id);
  if (!campaign) return json({ error: "Not found" }, { status: 404 });
  campaign.status = status;
  campaign.updatedAt = new Date().toISOString();
  return json(campaign);
}
