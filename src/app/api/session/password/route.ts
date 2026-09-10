import { prisma } from "@/lib/prisma";
import { auth as betterAuth } from "@/lib/auth";
import { requireApiUser, isResponse, json, apiError, parseBody } from "@/lib/api";
import { setPasswordSchema } from "@/lib/validation";

/**
 * Gives a Google-only account its first password, so it can also sign in with
 * email. Changing an existing password is a different thing — it needs the
 * current one and goes through Better Auth's changePassword on the client.
 */
export async function POST(req: Request) {
  const user = await requireApiUser(req);
  if (isResponse(user)) return user;

  const body = await parseBody(req, setPasswordSchema);
  if (isResponse(body)) return body;

  const credential = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  });
  if (credential) {
    return apiError(
      409,
      "This account already has a password — change it with your current one.",
    );
  }

  try {
    await betterAuth.api.setPassword({
      body: { newPassword: body.newPassword },
      headers: req.headers,
    });
  } catch (err) {
    console.error("[password] set failed:", (err as Error).message);
    return apiError(400, "Could not set that password. Try a different one.");
  }
  return json({ ok: true } as const);
}
