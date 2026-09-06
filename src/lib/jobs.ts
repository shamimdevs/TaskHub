/**
 * Public read helpers for the marketing "Jobs" pages. These surface the same
 * open tasks a worker would see, without needing a session — read straight
 * from the database, so an empty install shows no jobs.
 */
import "server-only";
import type { Platform as PrismaPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toTask } from "@/lib/dto";
import type { Platform, Task } from "@/types";

/** A task is public only while its campaign is live and slots remain. */
const OPEN = { slotsLeft: { gt: 0 }, campaign: { status: "active" as const } };

/** Open jobs (slots left), newest first, optionally filtered by platform. */
export async function listJobs(platform?: string): Promise<Task[]> {
  const rows = await prisma.task.findMany({
    where: {
      ...OPEN,
      ...(platform && platform !== "all"
        ? { platform: platform as PrismaPlatform }
        : {}),
    },
    orderBy: { postedAt: "desc" },
  });
  return rows.map(toTask);
}

export async function getJob(id: string): Promise<Task | undefined> {
  const row = await prisma.task.findUnique({ where: { id } });
  return row ? toTask(row) : undefined;
}

/** Platforms that currently have at least one open job. */
export async function jobPlatforms(): Promise<Platform[]> {
  const rows = await prisma.task.groupBy({ by: ["platform"], where: OPEN });
  return rows.map((r) => r.platform);
}
