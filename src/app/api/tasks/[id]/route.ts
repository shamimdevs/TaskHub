import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json, apiError } from "@/lib/api";

export async function GET(req: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return apiError(404, "Task not found");
  return json(task);
}
