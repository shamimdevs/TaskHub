/**
 * Public read helpers for the marketing "Jobs" pages. These surface the same
 * open tasks a worker would see, without needing a session. Backed by the mock
 * dataset for now — swap for a real query in the backend phase.
 */
import { tasks } from "@/lib/mock";
import type { Platform, Task } from "@/types";

/** Open jobs (slots left), newest first, optionally filtered by platform. */
export function listJobs(platform?: string): Task[] {
  return [...tasks]
    .filter((t) => t.slotsLeft > 0)
    .filter((t) => !platform || platform === "all" || t.platform === platform)
    .sort((a, b) => +new Date(b.postedAt) - +new Date(a.postedAt));
}

export function getJob(id: string): Task | undefined {
  return tasks.find((t) => t.id === id);
}

/** Platforms that currently have at least one open job. */
export function jobPlatforms(): Platform[] {
  return [...new Set(listJobs().map((t) => t.platform))];
}
