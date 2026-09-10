import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json, parseBody } from "@/lib/api";
import { pushTokenSchema } from "@/lib/validation";
import { pushEnabled } from "@/lib/push";

/** Whether the server can send push at all — the button asks before offering. */
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const devices = await prisma.pushToken.count({ where: { userId: auth.id } });
  return json({ enabled: pushEnabled(), devices });
}

/**
 * Register this device. FCM hands the same browser a new token whenever it
 * feels like it, so the token is the key: re-registering moves an existing row
 * to whoever is signed in now (shared phone, second account).
 */
export async function POST(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const body = await parseBody(req, pushTokenSchema);
  if (isResponse(body)) return body;

  const userAgent = req.headers.get("user-agent")?.slice(0, 255) ?? null;
  await prisma.pushToken.upsert({
    where: { token: body.token },
    update: { userId: auth.id, userAgent, lastSeenAt: new Date() },
    create: { token: body.token, userId: auth.id, userAgent },
  });
  return json({ ok: true } as const, { status: 201 });
}

/** Sign-out, or "turn push off on this device". */
export async function DELETE(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const body = await parseBody(req, pushTokenSchema);
  if (isResponse(body)) return body;

  await prisma.pushToken.deleteMany({
    where: { token: body.token, userId: auth.id },
  });
  return json({ ok: true } as const);
}
