import type { Platform, TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json } from "@/lib/api";

export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const sp = new URL(req.url).searchParams;
  const platform = sp.get("platform");
  const type = sp.get("type");

  const tasks = await prisma.task.findMany({
    where: {
      slotsLeft: { gt: 0 },
      campaign: { status: "active" },
      // A task is done once per worker, so one they have already submitted is
      // not available to them. Filtering it out here is the difference between
      // finding that out now and finding it out after doing the work.
      submissions: { none: { workerId: auth.id } },
      ...(platform && platform !== "all" ? { platform: platform as Platform } : {}),
      ...(type && type !== "all" ? { type: type as TaskType } : {}),
    },
    orderBy: { postedAt: "desc" },
  });
  return json(tasks);
}
