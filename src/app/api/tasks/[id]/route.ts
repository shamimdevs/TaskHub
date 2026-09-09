import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json, apiError } from "@/lib/api";

export async function GET(req: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return apiError(404, "Task not found");

  // The list hides tasks this worker has already done, but the link to one
  // survives — a bookmark, the back button, a share. Say so up front rather
  // than letting them do the work and refusing the proof afterwards.
  const mine = await prisma.submission.findFirst({
    where: { taskId: id, workerId: auth.id },
    select: { id: true, status: true },
  });

  return json({
    ...task,
    alreadySubmitted: Boolean(mine),
    submissionId: mine?.id ?? null,
  });
}
