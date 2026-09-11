import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json, apiError } from "@/lib/api";

export async function GET(req: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;

  const found = await prisma.task.findUnique({
    where: { id },
    include: { campaign: { select: { targetRef: true } } },
  });
  if (!found) return apiError(404, "Task not found");
  const { campaign, ...task } = found;

  // The list hides tasks this worker has already done, but the link to one
  // survives — a bookmark, the back button, a share. Say so up front rather
  // than letting them do the work and refusing the proof afterwards.
  const mine = await prisma.submission.findFirst({
    where: { taskId: id, workerId: auth.id },
    select: { id: true, status: true },
  });

  return json({
    ...task,
    // Checked against the worker's own linked account, which they need to
    // have connected before doing the work — the page says so up front.
    autoCheck: Boolean(campaign.targetRef),
    alreadySubmitted: Boolean(mine),
    submissionId: mine?.id ?? null,
  });
}
