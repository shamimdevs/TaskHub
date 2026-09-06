import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json } from "@/lib/api";
import { facebookConfigured } from "@/lib/facebook";

/** The signed-in person's linked social accounts. */
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const accounts = await prisma.socialAccount.findMany({
    where: { userId: auth.id },
    orderBy: { connectedAt: "asc" },
    select: {
      id: true,
      provider: true,
      name: true,
      profileUrl: true,
      connectedAt: true,
    },
  });

  return json({
    /** Providers this server can actually link right now. */
    available: { facebook: facebookConfigured },
    accounts,
  });
}
