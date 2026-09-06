import "server-only";
import { Prisma } from "@prisma/client";
import { getSettings } from "./settings";
import { postTransaction } from "./wallet";

type Tx = Prisma.TransactionClient;

/**
 * Called after a worker earns their first released reward. If they were
 * referred, credit the referrer the referral bonus and mark the link qualified.
 * Idempotent — a second call is a no-op.
 */
export async function maybeQualifyReferral(tx: Tx, workerId: string) {
  const worker = await tx.user.findUnique({
    where: { id: workerId },
    select: { referredById: true, name: true },
  });
  if (!worker?.referredById) return;

  const referral = await tx.referral.findFirst({
    where: { referrerId: worker.referredById, referredUserId: workerId },
  });
  if (referral?.status === "qualified") return;

  const settings = await getSettings();
  const bonus = new Prisma.Decimal(settings.referralBonus);

  await postTransaction({
    tx,
    userId: worker.referredById,
    type: "referral_bonus",
    direction: "credit",
    amount: bonus,
    description: `Referral bonus — ${worker.name} qualified`,
    reference: workerId,
  });

  if (referral) {
    await tx.referral.update({
      where: { id: referral.id },
      data: { status: "qualified", earnedForYou: { increment: bonus } },
    });
  } else {
    await tx.referral.create({
      data: {
        referrerId: worker.referredById,
        referredUserId: workerId,
        name: worker.name,
        status: "qualified",
        earnedForYou: bonus,
      },
    });
  }
}
