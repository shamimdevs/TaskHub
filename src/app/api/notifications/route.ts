import { db, json, me, roleFromRequest, tick } from "@/app/api/_data/db";
import { notifications as seed } from "@/lib/mock";

export async function GET(req: Request) {
  await tick();
  const role = roleFromRequest(req);
  const uid = me(role).id;
  // seed per-role notifications lazily
  if (!db.notifications.some((n) => n.userId === uid)) {
    db.notifications.push(...seed(uid));
  }
  return json(
    db.notifications
      .filter((n) => n.userId === uid)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  );
}

export async function PATCH(req: Request) {
  await tick();
  const role = roleFromRequest(req);
  const uid = me(role).id;
  db.notifications.forEach((n) => {
    if (n.userId === uid) n.read = true;
  });
  return json({ ok: true });
}
