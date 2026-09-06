import { prisma } from "@/lib/prisma";
import { requireApiRole, isResponse, json, apiError, parseBody } from "@/lib/api";
import { createCampaignSchema } from "@/lib/validation";
import { createCampaign } from "@/lib/domain/campaigns";
import { DomainError } from "@/lib/domain/errors";

export async function GET(req: Request) {
  const auth = await requireApiRole(req, ["buyer", "admin"]);
  if (isResponse(auth)) return auth;

  const scope = new URL(req.url).searchParams.get("scope");
  const where =
    auth.role === "admin" && scope === "all" ? {} : { buyerId: auth.id };

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return json(campaigns);
}

export async function POST(req: Request) {
  const auth = await requireApiRole(req, "buyer");
  if (isResponse(auth)) return auth;

  const body = await parseBody(req, createCampaignSchema);
  if (isResponse(body)) return body;

  try {
    const campaign = await createCampaign({ id: auth.id, name: auth.name }, body);
    return json(campaign, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return apiError(e.status, e.message);
    throw e;
  }
}
