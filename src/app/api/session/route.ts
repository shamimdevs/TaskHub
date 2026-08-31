import { db, json, me, roleFromRequest, tick } from "@/app/api/_data/db";

export async function GET(req: Request) {
  await tick();
  const role = roleFromRequest(req);
  const user = me(role);
  // reflect any balance changes stored on the shared user list
  const stored = db.users.find((u) => u.role === role);
  return json({ ...user, ...(stored ? { status: stored.status } : {}) });
}
