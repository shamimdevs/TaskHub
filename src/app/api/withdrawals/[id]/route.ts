import { requireApiRole, isResponse, json, apiError, parseBody } from "@/lib/api";
import { reviewWithdrawalSchema } from "@/lib/validation";
import { reviewWithdrawal } from "@/lib/domain/payments";
import { DomainError } from "@/lib/domain/errors";

export async function PATCH(req: Request, ctx: RouteContext<"/api/withdrawals/[id]">) {
  const auth = await requireApiRole(req, "admin");
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;

  const body = await parseBody(req, reviewWithdrawalSchema);
  if (isResponse(body)) return body;

  try {
    const withdrawal = await reviewWithdrawal(auth.id, id, body.action, body.note);
    return json(withdrawal);
  } catch (e) {
    if (e instanceof DomainError) return apiError(e.status, e.message);
    throw e;
  }
}
