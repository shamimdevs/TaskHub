import { prisma } from "@/lib/prisma";
import { requireApiRole, isResponse, json } from "@/lib/api";
import { facebookConfigured, instagramUrl, pageUrl } from "@/lib/facebook";

/** The buyer's connected pages — what the campaign form offers as targets. */
export async function GET(req: Request) {
  const auth = await requireApiRole(req, ["buyer", "admin"]);
  if (isResponse(auth)) return auth;

  const rows = await prisma.facebookPage.findMany({
    where: auth.role === "admin" ? {} : { ownerId: auth.id },
    orderBy: { connectedAt: "desc" },
  });

  return json({
    configured: facebookConfigured,
    pages: rows.map((p) => ({
      id: p.id,
      pageId: p.pageId,
      name: p.name,
      url: pageUrl(p),
      followers: p.followers,
      instagram: p.instagramId
        ? {
            id: p.instagramId,
            username: p.instagramUsername,
            followers: p.instagramFollowers ?? 0,
            url: instagramUrl(p.instagramUsername ?? p.instagramId),
          }
        : null,
      lastCheckedAt: p.lastCheckedAt,
      lastError: p.lastError,
    })),
  });
}
