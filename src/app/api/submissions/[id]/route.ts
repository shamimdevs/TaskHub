import { requireApiRole, isResponse, json, apiError, parseBody } from "@/lib/api";
import { reviewSubmissionSchema } from "@/lib/validation";
import { reviewSubmission } from "@/lib/domain/submissions";
import { DomainError } from "@/lib/domain/errors";

export async function PATCH(req: Request, ctx: RouteContext<"/api/submissions/[id]">) {
  const auth = await requireApiRole(req, "admin");
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;

  const body = await parseBody(req, reviewSubmissionSchema);
  if (isResponse(body)) return body;

  try {
    const submission = await reviewSubmission(auth.id, id, body.action, body.note);
    return json(submission);
  } catch (e) {
    if (e instanceof DomainError) return apiError(e.status, e.message);
    throw e;
  }
}
