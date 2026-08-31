import { db, json, tick } from "@/app/api/_data/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  await tick();
  const { id } = await ctx.params;
  const task = db.tasks.find((t) => t.id === id);
  if (!task) return json({ error: "Task not found" }, { status: 404 });
  return json(task);
}
