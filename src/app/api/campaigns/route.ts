import { db, json, me, roleFromRequest, tick } from "@/app/api/_data/db";
import { LIMITS, PRICING } from "@/lib/constants";
import type { Campaign } from "@/types";

export async function GET(req: Request) {
  await tick();
  const role = roleFromRequest(req);
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  let items = db.campaigns;
  if (role === "buyer" && scope !== "all") {
    const uid = me("buyer").id;
    items = items.filter((c) => c.buyerId === uid || c.buyerName === "Sadia Akter");
  }
  return json(
    [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  );
}

export async function POST(req: Request) {
  await tick();
  const body = (await req.json()) as {
    platform: Campaign["platform"];
    type: Campaign["type"];
    title: string;
    targetUrl: string;
    quantity: number;
    note?: string;
  };
  const quantity = Math.max(LIMITS.minCampaignQty, Number(body.quantity) || 0);
  const now = new Date().toISOString();
  const campaign: Campaign = {
    id: `c_${Date.now()}`,
    buyerId: me("buyer").id,
    buyerName: "Sadia Akter",
    platform: body.platform,
    type: body.type,
    title: body.title || "Untitled campaign",
    targetUrl: body.targetUrl,
    quantity,
    delivered: 0,
    ratePerAction: PRICING.clientRatePerAction,
    workerReward: PRICING.workerRewardPerAction,
    totalCost: +(quantity * PRICING.clientRatePerAction).toFixed(2),
    status: "pending_review",
    holdDays: LIMITS.holdDaysDefault,
    note: body.note,
    createdAt: now,
    updatedAt: now,
  };
  db.campaigns.unshift(campaign);
  return json(campaign, { status: 201 });
}
