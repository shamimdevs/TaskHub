import { prisma } from "@/lib/prisma";
import { requireApiRole, isResponse, json, apiError, parseBody } from "@/lib/api";
import { updateUserSchema } from "@/lib/validation";
import { adminUpdateUser } from "@/lib/domain/users";
import { toUser } from "@/lib/dto";
import { DomainError } from "@/lib/domain/errors";

export async function GET(req: Request, ctx: RouteContext<"/api/users/[id]">) {
  const auth = await requireApiRole(req, "admin");
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return apiError(404, "User not found");
  return json(toUser(user));
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/users/[id]">) {
  const auth = await requireApiRole(req, "admin");
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;

  const body = await parseBody(req, updateUserSchema);
  if (isResponse(body)) return body;

  try {
    const user = await adminUpdateUser(id, body.action, {
      reason: body.reason,
      amount: body.amount,
    });
    return json(toUser(user));
  } catch (e) {
    if (e instanceof DomainError) return apiError(e.status, e.message);
    throw e;
  }
}
