import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json } from "@/lib/api";

export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const notifications = await prisma.notification.findMany({
    where: { userId: auth.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return json(notifications);
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  await prisma.notification.updateMany({
    where: { userId: auth.id, read: false },
    data: { read: true },
  });
  return json({ ok: true } as const);
}
