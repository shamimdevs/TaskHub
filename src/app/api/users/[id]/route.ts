import { db, json, tick } from "@/app/api/_data/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/users/[id]">) {
  await tick();
  const { id } = await ctx.params;
  const user = db.users.find((u) => u.id === id);
  if (!user) return json({ error: "Not found" }, { status: 404 });
  return json(user);
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/users/[id]">) {
  await tick();
  const { id } = await ctx.params;
  const { action, reason, amount } = (await req.json()) as {
    action: "ban" | "unban" | "adjust";
    reason?: string;
    amount?: number;
  };
  const user = db.users.find((u) => u.id === id);
  if (!user) return json({ error: "Not found" }, { status: 404 });
  if (action === "ban") {
    user.status = "banned";
    user.banReason = reason || "Policy violation";
  } else if (action === "unban") {
    user.status = "active";
    user.banReason = undefined;
  } else if (action === "adjust") {
    user.balance = +(user.balance + (Number(amount) || 0)).toFixed(2);
  }
  return json(user);
}
