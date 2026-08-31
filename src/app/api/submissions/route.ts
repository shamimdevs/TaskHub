import { db, json, me, roleFromRequest, tick } from "@/app/api/_data/db";
import type { Submission } from "@/types";

export async function GET(req: Request) {
  await tick();
  const role = roleFromRequest(req);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  let items = db.submissions;
  if (role === "worker") {
    const uid = me("worker").id;
    items = items.filter((s) => s.workerId === uid || s.workerName === "Rakib Hasan");
  }
  if (status && status !== "all") items = items.filter((s) => s.status === status);
  return json(
    [...items].sort(
      (a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt),
    ),
  );
}

export async function POST(req: Request) {
  await tick();
  const body = (await req.json()) as {
    taskId: string;
    proofUrl: string;
    proofNote?: string;
  };
  const task = db.tasks.find((t) => t.id === body.taskId) ?? db.tasks[0];
  const now = new Date();
  const holdUntil = new Date(now.getTime() + task.holdDays * 86_400_000);
  const sub: Submission = {
    id: `s_${Date.now()}`,
    taskId: task.id,
    campaignId: task.campaignId,
    workerId: me("worker").id,
    workerName: "Rakib Hasan",
    platform: task.platform,
    type: task.type,
    title: task.title,
    reward: task.reward,
    status: "pending",
    proofUrl: body.proofUrl,
    proofNote: body.proofNote,
    submittedAt: now.toISOString(),
    holdUntil: holdUntil.toISOString(),
  };
  db.submissions.unshift(sub);
  if (task.slotsLeft > 0) task.slotsLeft -= 1;
  return json(sub, { status: 201 });
}
