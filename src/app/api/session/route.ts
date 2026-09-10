import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json, apiError } from "@/lib/api";
import { toUser } from "@/lib/dto";
import { imagekitConfigured } from "@/lib/imagekit";

export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const user = await prisma.user.findUnique({ where: { id: auth.id } });
  if (!user) return apiError(404, "User not found");

  const credential = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  });

  // keep "last seen" fresh without blocking the response
  prisma.user
    .update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })
    .catch(() => {});

  return json({
    ...toUser(user),
    emailVerified: user.emailVerified,
    hasPassword: Boolean(credential),
    // The keys live on the server, so the panel is told whether to offer the
    // upload button rather than checking for itself.
    canUploadImages: imagekitConfigured(),
  });
}
