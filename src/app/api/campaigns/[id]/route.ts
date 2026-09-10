import type { CampaignStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireApiRole, isResponse, json, apiError, parseBody } from "@/lib/api";
import { updateCampaignSchema } from "@/lib/validation";
import { reviewCampaign } from "@/lib/domain/campaigns";
import { DomainError } from "@/lib/domain/errors";

export async function GET(req: Request, ctx: RouteContext<"/api/campaigns/[id]">) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return apiError(404, "Campaign not found");
  if (auth.role === "buyer" && campaign.buyerId !== auth.id) {
    return apiError(403, "Forbidden");
  }
  return json(campaign);
}

/**
 * What a buyer may do to their own campaign, keyed by target status, with the
 * statuses each move may start from. Anything else — approving a campaign out
 * of review, rejecting, completing — stays with the admin.
 */
const BUYER_MOVES: Partial<Record<CampaignStatus, CampaignStatus[]>> = {
  paused: ["active"],
  active: ["paused"],
  cancelled: ["active", "paused", "pending_review"],
};

export async function PATCH(req: Request, ctx: RouteContext<"/api/campaigns/[id]">) {
  const auth = await requireApiRole(req, ["admin", "buyer"]);
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;

  const body = await parseBody(req, updateCampaignSchema);
  if (isResponse(body)) return body;

  let opts = {};
  if (auth.role === "buyer") {
    const allowedFrom = BUYER_MOVES[body.status];
    if (!allowedFrom) return apiError(403, "Forbidden");
    opts = { allowedFrom, ownerId: auth.id };
  }

  try {
    const campaign = await reviewCampaign(id, body.status, opts);
    return json(campaign);
  } catch (e) {
    if (e instanceof DomainError) return apiError(e.status, e.message);
    throw e;
  }
}
