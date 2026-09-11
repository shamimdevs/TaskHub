import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/utils";
import { postTransaction, releaseHeldReward } from "./wallet";
import { maybeQualifyReferral } from "./referrals";
import { notify } from "./notifications";
import { DomainError } from "./errors";

/** What a worker is told when they try to take the same task twice. */
const ALREADY_SUBMITTED = "You have already submitted this task";

/**
 * Take a task, once.
 *
 * The duplicate check below is the courteous half: it answers before any slot
 * is spent, so the ordinary case gets a plain refusal. It is not the guarantee
 * — it reads and then writes, and two requests racing each other can both read
 * nothing. `Submission @@unique([taskId, workerId])` is the guarantee, and the
 * catch at the bottom turns the loser of that race into the same refusal.
 */
export async function createSubmission(
  worker: { id: string; name: string },
  input: { taskId: string; proofUrl: string; proofNote?: string; screenshotUrl?: string },
) {
  try {
    return await submitOnce(worker, input);
  } catch (e) {
    // The unique index caught what the read-then-write could not. Same answer
    // as the sequential path: they already did this one.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new DomainError(ALREADY_SUBMITTED, 409);
    }
    throw e;
  }
}

async function submitOnce(
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
    if (dupe) throw new DomainError(ALREADY_SUBMITTED, 409);

    // A linked account is the proof: the profile link comes from it rather
    // than from whatever was typed into the form. One social account can only
    // belong to one worker, so this also stops the same profile farming a task
    // through several TaskHub accounts.
    const linked = await tx.socialAccount.findUnique({
      where: { userId_provider: { userId: worker.id, provider: task.platform } },
      select: { providerId: true, profileUrl: true, refreshToken: true },
    });

    // A campaign with a `targetRef` is settled by asking the platform about
    // this worker specifically, which is impossible without their linked
    // account. Say so now rather than accepting a submission that could only
    // ever sit pending waiting for an answer that cannot come.
    if (task.campaign.targetRef && !linked?.refreshToken) {
      throw new DomainError(
        `Connect your ${task.platform} channel under Connected accounts first — this task is checked against it`,
      );
    }

    // One account, one reward per campaign. The one-account-one-worker rule
    // only holds at any single moment: a channel can be unlinked from one
    // worker and relinked to another, and its subscription is still there.
    const accountRef = linked?.providerId ?? null;
    if (accountRef) {
      const reused = await tx.submission.findFirst({
        where: {
          campaignId: task.campaignId,
          accountRef,
          status: { not: "rejected" },
        },
        select: { id: true },
      });
      if (reused) {
        throw new DomainError(
          `This ${task.platform} account has already been used for this task`,
          409,
        );
      }
    }

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
        accountRef,
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
 * automatic checker did it rather than a person — those are flagged
 * `autoVerified` so the UI can say so. Only the checker approves; the admin
 * route accepts `reject` and `penalize` alone.
 *
 * Approving completes the submission and credits the reward straight into the
 * worker's balance, held until `holdUntil`: it shows in the balance but a
 * withdrawal cannot take it until `releaseDueRewards` lifts the hold.
 */
export async function reviewSubmission(
  reviewerId: string | null,
  id: string,
  action: ReviewAction,
  note?: string,
) {
  const autoVerified = reviewerId === null;
  const submission = await prisma.$transaction(async (tx) => {
    const sub = await tx.submission.findUnique({ where: { id }, include: { task: true } });
    if (!sub) throw new DomainError("Submission not found", 404);

    const now = new Date();
    const trimmedNote = note?.trim() || null;

    /**
     * Move the row out of the state `sub` was read in, or refuse.
     *
     * The status check on `sub` above is only a read: the on-submit check, the
     * cron (on more than one instance) and an admin can all hold the same
     * pending row at once, and each would pass it and post the money again.
     * A conditional update takes the row lock, so the second one waits, then
     * finds the status already moved and matches nothing.
     */
    const claim = async (data: Prisma.SubmissionUncheckedUpdateManyInput) => {
      const { count } = await tx.submission.updateMany({
        where: { id, status: sub.status, releasedAt: sub.releasedAt },
        data,
      });
      if (count === 0) throw new DomainError("This submission was already settled", 409);
    };

    if (action === "approve") {
      if (sub.status !== "pending") throw new DomainError("Only pending submissions can be approved");
      await claim({
        status: "approved",
        reviewedAt: now,
        reviewedById: reviewerId,
        autoVerified,
        reviewerNote: trimmedNote,
        holdUntil: new Date(now.getTime() + sub.task.holdDays * 86_400_000),
        releasedAt: null,
        lastCheckedAt: now,
      });
      await postTransaction({
        tx,
        userId: sub.workerId,
        type: "task_reward",
        direction: "credit",
        amount: sub.reward,
        description: `Task reward — ${sub.title}`,
        reference: sub.id,
        held: true,
      });
      return tx.submission.findUniqueOrThrow({ where: { id } });
    }

    if (action === "reject") {
      if (sub.status === "rejected" || sub.status === "reversed") {
        throw new DomainError("This submission was already settled");
      }
      // Past the hold the delivery is final; only a penalty can claw it back.
      if (sub.status === "approved" && sub.releasedAt) {
        throw new DomainError("This reward has already cleared — penalize instead");
      }
      await claim({
        status: "rejected",
        reviewedAt: now,
        reviewedById: reviewerId,
        autoVerified,
        reviewerNote: trimmedNote ?? "Proof did not meet the requirements.",
      });
      if (sub.status === "approved") {
        // Still held: take the reward back out of the balance it went into.
        await postTransaction({
          tx,
          userId: sub.workerId,
          type: "adjustment",
          direction: "debit",
          amount: sub.reward,
          description: `Reward reversed — ${sub.title}`,
          reference: sub.id,
        });
        await releaseHeldReward({ tx, userId: sub.workerId, amount: sub.reward });
        await tx.user.update({
          where: { id: sub.workerId },
          data: { lifetimeEarned: { decrement: sub.reward } },
        });
      }
      // free the slot back onto the task
      await tx.task.update({ where: { id: sub.taskId }, data: { slotsLeft: { increment: 1 } } });
      await tx.campaign.update({
        where: { id: sub.campaignId },
        data: { delivered: { decrement: 1 } },
      });
      return tx.submission.findUniqueOrThrow({ where: { id } });
    }

    // penalize — claw back a completed submission's reward
    if (sub.status !== "approved") {
      throw new DomainError("Only completed submissions can be penalised");
    }
    await claim({
      status: "reversed",
      reviewedAt: now,
      reviewedById: reviewerId,
      autoVerified,
      reviewerNote: trimmedNote ?? "Engagement was undone after the reward cleared.",
    });
    await postTransaction({
      tx,
      userId: sub.workerId,
      type: "penalty",
      direction: "debit",
      amount: sub.reward,
      description: `Penalty — reward reversed for "${sub.title}"`,
      reference: sub.id,
    });
    // A reward penalised while still held must not keep locking the balance.
    if (!sub.releasedAt) {
      await releaseHeldReward({ tx, userId: sub.workerId, amount: sub.reward });
    }
    return tx.submission.findUniqueOrThrow({ where: { id } });
  });

  // Whichever branch ran, the worker hears about it once, after the commit.
  const said = {
    approved: {
      kind: "success" as const,
      title: "Task complete",
      body: `${formatMoney(submission.reward.toNumber())} was added to your balance. It is on hold and can be withdrawn from ${formatDate(submission.holdUntil)}.`,
    },
    rejected: {
      kind: "danger" as const,
      title: "Submission rejected",
      body: submission.reviewerNote || "Your proof did not meet the requirements.",
    },
    reversed: {
      kind: "danger" as const,
      title: "Reward reversed",
      body: submission.reviewerNote || "The engagement was undone after the reward cleared.",
    },
    pending: null,
  }[submission.status];

  if (said) {
    await notify({
      userId: submission.workerId,
      ...said,
      href: "/worker/submissions",
      invalidate: ["Submission", "Wallet", "Task"],
    });
  }
  return submission;
}

/**
 * Lifts the hold on every completed submission whose hold window has elapsed:
 * the reward, already in the balance, becomes withdrawable, and any pending
 * referral qualifies. Safe to call opportunistically on reads and from the
 * cron endpoint.
 */
export async function releaseDueRewards(): Promise<number> {
  const due = await prisma.submission.findMany({
    where: { status: "approved", releasedAt: null, holdUntil: { lte: new Date() } },
    select: { id: true, workerId: true, reward: true, title: true },
    take: 500,
  });
  let released = 0;
  const settled: typeof due = [];
  for (const s of due) {
    await prisma.$transaction(async (tx) => {
      // Conditional, so a reversal racing this release cannot have both of
      // them take the reward out of `heldBalance`: whichever locks the row
      // second finds it already moved and does nothing.
      const { count } = await tx.submission.updateMany({
        where: { id: s.id, status: "approved", releasedAt: null },
        data: { releasedAt: new Date() },
      });
      if (count === 0) return;
      await releaseHeldReward({ tx, userId: s.workerId, amount: s.reward });
      await maybeQualifyReferral(tx, s.workerId);
      released++;
      settled.push(s);
    });
  }

  // The hold is the part workers actually wait on, so this one is worth a push.
  for (const s of settled) {
    await notify({
      userId: s.workerId,
      kind: "success",
      title: "Reward cleared",
      body: `${formatMoney(s.reward.toNumber())} for "${s.title}" is off hold and can be withdrawn.`,
      href: "/worker/wallet",
      invalidate: ["Wallet", "Submission"],
    });
  }
  return released;
}

export const DECIMAL_ZERO = new Prisma.Decimal(0);
