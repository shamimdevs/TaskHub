import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { postTransaction, settlePendingReward } from "./wallet";
import { maybeQualifyReferral } from "./referrals";
import { DomainError } from "./errors";

export async function createSubmission(
  worker: { id: string; name: string },
  input: { taskId: string; proofUrl: string; proofNote?: string; screenshotUrl?: string },
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: input.taskId },
      include: { campaign: true },
    });
    if (!task) throw new DomainError("Task not found", 404);
    if (task.campaign.status !== "active") throw new DomainError("This task is no longer active");
    if (task.slotsLeft <= 0) throw new DomainError("No slots left on this task");

    const dupe = await tx.submission.findFirst({
      where: { taskId: task.id, workerId: worker.id },
      select: { id: true },
    });
    if (dupe) throw new DomainError("You have already submitted this task", 409);

    // A linked account is the proof: the profile link comes from it rather
    // than from whatever was typed into the form. One social account can only
    // belong to one worker, so this also stops the same profile farming a task
    // through several TaskHub accounts.
    const linked = await tx.socialAccount.findUnique({
      where: { userId_provider: { userId: worker.id, provider: task.platform } },
      select: { profileUrl: true },
    });
    const proofUrl = linked?.profileUrl ?? input.proofUrl.trim();
    if (!proofUrl) throw new DomainError("Add your profile link");

    await tx.task.update({ where: { id: task.id }, data: { slotsLeft: { decrement: 1 } } });
    await tx.campaign.update({
      where: { id: task.campaignId },
      data: { delivered: { increment: 1 } },
    });

    return tx.submission.create({
      data: {
        taskId: task.id,
        campaignId: task.campaignId,
        workerId: worker.id,
        workerName: worker.name,
        platform: task.platform,
        type: task.type,
        title: task.title,
        reward: task.reward,
        status: "pending",
        proofUrl,
        proofNote: input.proofNote?.trim() || null,
        screenshotUrl: input.screenshotUrl?.trim() || null,
        holdUntil: new Date(Date.now() + task.holdDays * 86_400_000),
      },
    });
  });
}

type ReviewAction = "approve" | "reject" | "penalize";

/**
 * Clear, refuse or claw back one submission. `reviewerId` is null when the
 * follower-count checker did it rather than a person — those are flagged
 * `autoVerified` so the UI can say so.
 */
export async function reviewSubmission(
  reviewerId: string | null,
  id: string,
  action: ReviewAction,
  note?: string,
) {
  const autoVerified = reviewerId === null;
  return prisma.$transaction(async (tx) => {
    const sub = await tx.submission.findUnique({ where: { id }, include: { task: true } });
    if (!sub) throw new DomainError("Submission not found", 404);

    const now = new Date();
    const trimmedNote = note?.trim() || null;

    if (action === "approve") {
      if (sub.status !== "pending") throw new DomainError("Only pending submissions can be approved");
      await postTransaction({
        tx,
        userId: sub.workerId,
        type: "task_reward",
        direction: "credit",
        amount: sub.reward,
        description: `Reward held — ${sub.title}`,
        reference: sub.id,
        pending: true,
      });
      return tx.submission.update({
        where: { id },
        data: {
          status: "on_hold",
          reviewedAt: now,
          reviewedById: reviewerId,
          autoVerified,
          reviewerNote: trimmedNote,
          holdUntil: new Date(now.getTime() + sub.task.holdDays * 86_400_000),
        },
      });
    }

    if (action === "reject") {
      if (sub.status === "approved" || sub.status === "reversed") {
        throw new DomainError("This submission was already settled");
      }
      if (sub.status === "on_hold") {
        // undo the held credit
        await tx.user.update({
          where: { id: sub.workerId },
          data: { pendingBalance: { decrement: sub.reward } },
        });
        await tx.walletTransaction.updateMany({
          where: { userId: sub.workerId, reference: sub.id, type: "task_reward", status: "pending" },
          data: { status: "reversed" },
        });
      }
      // free the slot back onto the task
      await tx.task.update({ where: { id: sub.taskId }, data: { slotsLeft: { increment: 1 } } });
      await tx.campaign.update({
        where: { id: sub.campaignId },
        data: { delivered: { decrement: 1 } },
      });
      return tx.submission.update({
        where: { id },
        data: {
          status: "rejected",
          reviewedAt: now,
          reviewedById: reviewerId,
          autoVerified,
          reviewerNote: trimmedNote ?? "Proof did not meet the requirements.",
        },
      });
    }

    // penalize — claw back an already-released reward
    if (sub.status !== "approved") {
      throw new DomainError("Only approved submissions can be penalised");
    }
    await postTransaction({
      tx,
      userId: sub.workerId,
      type: "penalty",
      direction: "debit",
      amount: sub.reward,
      description: `Penalty — reward reversed for "${sub.title}"`,
      reference: sub.id,
    });
    return tx.submission.update({
      where: { id },
      data: {
        status: "reversed",
        reviewedAt: now,
        reviewedById: reviewerId,
        autoVerified,
        reviewerNote: trimmedNote ?? "Engagement was undone after the reward cleared.",
      },
    });
  });
}

/**
 * Settles every submission whose hold window has elapsed: moves the reward from
 * pending to spendable balance and qualifies any pending referral.
 * Safe to call opportunistically on reads and from the cron endpoint.
 */
export async function releaseDueRewards(): Promise<number> {
  const due = await prisma.submission.findMany({
    where: { status: "on_hold", holdUntil: { lte: new Date() } },
    select: { id: true, workerId: true, reward: true, title: true },
    take: 500,
  });
  let released = 0;
  for (const s of due) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.submission.findUnique({ where: { id: s.id }, select: { status: true } });
      if (fresh?.status !== "on_hold") return;
      await settlePendingReward({
        tx,
        userId: s.workerId,
        reference: s.id,
        amount: s.reward,
        description: `Reward released — ${s.title}`,
      });
      await tx.submission.update({ where: { id: s.id }, data: { status: "approved" } });
      await maybeQualifyReferral(tx, s.workerId);
      released++;
    });
  }
  return released;
}

export const DECIMAL_ZERO = new Prisma.Decimal(0);
