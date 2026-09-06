import { prisma } from "@/lib/prisma";
import { requireApiRole, isResponse, json, apiError } from "@/lib/api";

/**
 * Disconnect a page. Campaigns keep running — `Campaign.pageId` is set null —
 * but nothing can verify them any more, so their submissions fall back to the
 * manual queue.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiRole(req, ["buyer", "admin"]);
  if (isResponse(auth)) return auth;

  const { id } = await params;
  const page = await prisma.facebookPage.findUnique({ where: { id } });
  if (!page) return apiError(404, "Page not found");
  if (auth.role !== "admin" && page.ownerId !== auth.id) {
    return apiError(403, "Not your page");
  }

  await prisma.facebookPage.delete({ where: { id } });
  return json({ disconnected: true });
}
