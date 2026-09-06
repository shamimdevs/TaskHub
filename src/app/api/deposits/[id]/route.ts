import { requireApiRole, isResponse, json, apiError, parseBody } from "@/lib/api";
import { reviewDepositSchema } from "@/lib/validation";
import { reviewDeposit } from "@/lib/domain/payments";
import { DomainError } from "@/lib/domain/errors";

export async function PATCH(req: Request, ctx: RouteContext<"/api/deposits/[id]">) {
  const auth = await requireApiRole(req, "admin");
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;

  const body = await parseBody(req, reviewDepositSchema);
  if (isResponse(body)) return body;

  try {
    const deposit = await reviewDeposit(auth.id, id, body.action, body.note);
    return json(deposit);
  } catch (e) {
    if (e instanceof DomainError) return apiError(e.status, e.message);
    throw e;
  }
}
