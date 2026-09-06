import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json, apiError, parseBody } from "@/lib/api";
import { setRoleSchema } from "@/lib/validation";
import { toUser } from "@/lib/dto";

/**
 * One-time role pick for accounts that never made one — a Google sign-up
 * lands on the default "worker" until the person answers /setup-role.
 * Deliberately write-once: switching sides later is not self-service.
 */
export async function POST(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const body = await parseBody(req, setRoleSchema);
  if (isResponse(body)) return body;

  const user = await prisma.user.findUnique({ where: { id: auth.id } });
  if (!user) return apiError(404, "User not found");
  if (user.role === "admin") return apiError(409, "Admins cannot change role");
  if (user.roleChosen) return apiError(409, "Your role is already set");

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: body.role, roleChosen: true },
  });
  return json(toUser(updated));
}
