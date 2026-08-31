import { db, json, tick } from "@/app/api/_data/db";

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/submissions/[id]">,
) {
  await tick();
  const { id } = await ctx.params;
  const { action, note } = (await req.json()) as {
    action: "approve" | "reject" | "penalize";
    note?: string;
  };
  const sub = db.submissions.find((s) => s.id === id);
  if (!sub) return json({ error: "Not found" }, { status: 404 });
  sub.status =
    action === "approve" ? "approved" : action === "reject" ? "rejected" : "reversed";
  sub.reviewedAt = new Date().toISOString();
  sub.reviewerNote = note;
  return json(sub);
}
