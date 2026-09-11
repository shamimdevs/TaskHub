import type { SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiRole, isResponse, json, apiError, parseBody } from "@/lib/api";
import { createSubmissionSchema } from "@/lib/validation";
import { createSubmission, releaseDueRewards } from "@/lib/domain/submissions";
import { checkSubmissionNow } from "@/lib/domain/verification";
import { DomainError } from "@/lib/domain/errors";

const STATUSES: SubmissionStatus[] = [
  "pending",
  "approved",
  "rejected",
  "reversed",
];

export async function GET(req: Request) {
  const auth = await requireApiRole(req, ["worker", "admin"]);
  if (isResponse(auth)) return auth;

  await releaseDueRewards();

  const statusParam = new URL(req.url).searchParams.get("status");
  const status =
    statusParam && STATUSES.includes(statusParam as SubmissionStatus)
      ? (statusParam as SubmissionStatus)
      : undefined;

  const submissions = await prisma.submission.findMany({
    where: {
      ...(auth.role === "worker" ? { workerId: auth.id } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { submittedAt: "desc" },
  });
  return json(submissions);
}

export async function POST(req: Request) {
  const auth = await requireApiRole(req, "worker");
  if (isResponse(auth)) return auth;

  const body = await parseBody(req, createSubmissionSchema);
  if (isResponse(body)) return body;

  let submission;
  try {
    submission = await createSubmission({ id: auth.id, name: auth.name }, body);
  } catch (e) {
    if (e instanceof DomainError) return apiError(e.status, e.message);
    throw e;
  }

  // A YouTube subscribe can be confirmed right now, as this worker. Best
  // effort only: the submission is already saved, and the cron settles
  // anything this could not.
  try {
    if (await checkSubmissionNow(submission.id)) {
      submission =
        (await prisma.submission.findUnique({ where: { id: submission.id } })) ??
        submission;
    }
  } catch (e) {
    console.error("[submissions] instant check failed:", (e as Error).message);
  }

  return json(submission, { status: 201 });
}
