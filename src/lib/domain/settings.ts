import "server-only";
import type { Platform, TaskType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  FEES,
  LIMITS,
  RATE_CARD,
  RATE_CARD_ENTRIES,
  USD_RATE,
} from "@/lib/constants";
import { DomainError } from "./errors";

const DEFAULTS = {
  usdRate: USD_RATE,
  minDeposit: LIMITS.minDeposit,
  minWithdraw: LIMITS.minWithdraw,
  withdrawFeePct: FEES.withdrawFeePct,
  holdDays: LIMITS.holdDaysDefault,
  referralBonus: LIMITS.referralBonus,
  autoApproveDeposits: false,
  autoVerify: true,
  autoVerifyGraceMins: 45,
  maintenanceMode: false,
};

/** Reads the platform settings singleton, seeding defaults on first access. */
export async function getSettings() {
  const row = await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", ...DEFAULTS },
  });
  return {
    usdRate: row.usdRate.toNumber(),
    minDeposit: row.minDeposit.toNumber(),
    minWithdraw: row.minWithdraw.toNumber(),
    withdrawFeePct: row.withdrawFeePct.toNumber(),
    holdDays: row.holdDays,
    referralBonus: row.referralBonus.toNumber(),
    autoApproveDeposits: row.autoApproveDeposits,
    autoVerify: row.autoVerify,
    autoVerifyGraceMins: row.autoVerifyGraceMins,
    maintenanceMode: row.maintenanceMode,
  };
}

/**
 * Reconciles the stored rate card with the pairs the code offers: missing ones
 * are created, retired ones are dropped. Prices that are still offered are
 * never touched, so admin edits survive.
 */
async function ensureRateCard() {
  const have = await prisma.rateCard.count();
  if (have === RATE_CARD_ENTRIES.length) return;
  await prisma.rateCard.createMany({
    data: RATE_CARD_ENTRIES.map((e) => ({
      platform: e.platform,
      type: e.type,
      rate: new Prisma.Decimal(e.rate),
    })),
    skipDuplicates: true,
  });
  // Actions pulled from `RATE_CARD` leave rows behind; without this the admin
  // rate card would keep listing prices nothing can be bought at any more.
  await prisma.rateCard.deleteMany({
    where: {
      NOT: {
        OR: RATE_CARD_ENTRIES.map((e) => ({
          platform: e.platform,
          type: e.type,
        })),
      },
    },
  });
}

/** The full rate card — one USD price per platform + action. */
export async function getRateCard() {
  await ensureRateCard();
  const rows = await prisma.rateCard.findMany({
    orderBy: [{ platform: "asc" }, { type: "asc" }],
  });
  return rows.map((r) => ({
    platform: r.platform,
    type: r.type,
    rate: r.rate.toNumber(),
    enabled: r.enabled,
  }));
}

/**
 * The live price for one platform + action, in USD. The buyer pays it and the
 * worker earns it — there is no spread.
 */
export async function getRate(platform: Platform, type: TaskType) {
  const row = await prisma.rateCard.findUnique({
    where: { platform_type: { platform, type } },
  });
  if (row) {
    if (!row.enabled) throw new DomainError(`${type} is paused on ${platform}`);
    return row.rate.toNumber();
  }
  const fallback = RATE_CARD[platform]?.[type];
  if (fallback === undefined) {
    throw new DomainError(`${type} is not offered on ${platform}`);
  }
  return fallback;
}
