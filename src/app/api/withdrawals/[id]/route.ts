import { db, json, tick } from "@/app/api/_data/db";

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/withdrawals/[id]">,
) {
  await tick();
  const { id } = await ctx.params;
  const { action, note } = (await req.json()) as {
    action: "approve" | "reject" | "markPaid";
    note?: string;
  };
  const row = db.withdrawals.find((w) => w.id === id);
  if (!row) return json({ error: "Not found" }, { status: 404 });
  row.status =
    action === "approve" ? "approved" : action === "markPaid" ? "paid" : "rejected";
  row.reviewedAt = new Date().toISOString();
  row.note = note ?? row.note;
  return json(row);
}
