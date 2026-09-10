/**
 * Seeds the bare minimum a fresh TaskHub install needs:
 *
 *   1. the super admin account
 *   2. the platform settings singleton — dollar rate, limits and the
 *      withdrawal commission
 *   3. the rate card — one USD price per platform + action
 *
 * No demo users, campaigns, tasks, payments or ledger rows: everything else
 * is created by real people using the app.
 *
 *   npm run db:seed        (or: prisma migrate reset)
 *
 * Override the admin with SEED_ADMIN_NAME / SEED_ADMIN_EMAIL /
 * SEED_ADMIN_PASSWORD in `.env`. Re-running is safe — it upserts.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { FEES, LIMITS, RATE_CARD_ENTRIES, USD_RATE } from "../src/lib/constants";

const prisma = new PrismaClient();

const ADMIN = {
  name: process.env.SEED_ADMIN_NAME || "Super Admin",
  email: (process.env.SEED_ADMIN_EMAIL || "admin@gmail.com").toLowerCase(),
  password: process.env.SEED_ADMIN_PASSWORD || "Password123!",
} as const;

/**
 * Limits + commission. The update only re-asserts `autoApproveDeposits`:
 * money must never be credited without a human looking at the TrxID, so a
 * fresh seed always puts deposits back in the pending queue. Every other
 * value the admin has since tuned is left alone.
 */
async function seedSettings() {
  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: { autoApproveDeposits: false },
    create: {
      id: "singleton",
      // Taka per dollar. Admins change this whenever the market moves.
      usdRate: USD_RATE,
      // Commission: the platform's only cut, taken on withdrawal.
      withdrawFeePct: FEES.withdrawFeePct,
      minDeposit: LIMITS.minDeposit,
      minWithdraw: LIMITS.minWithdraw,
      holdDays: LIMITS.holdDaysDefault,
      referralBonus: LIMITS.referralBonus,
      autoApproveDeposits: false,
      autoVerify: true,
      autoVerifyGraceMins: 45,
      maintenanceMode: false,
    },
  });
}

/**
 * One price per platform + action, in USD. Only missing pairs are created, so
 * re-seeding never overwrites a price the admin has tuned in the panel — but
 * pairs the platform no longer sells are deleted, so an install seeded before
 * an action was retired does not keep offering it.
 */
async function seedRateCard() {
  const created = await prisma.rateCard.createMany({
    data: RATE_CARD_ENTRIES,
    skipDuplicates: true,
  });
  const { count: removed } = await prisma.rateCard.deleteMany({
    where: {
      NOT: {
        OR: RATE_CARD_ENTRIES.map((e) => ({
          platform: e.platform,
          type: e.type,
        })),
      },
    },
  });
  return { created: created.count, removed };
}

async function seedSuperAdmin() {
  const admin = await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: { role: "admin", status: "active", emailVerified: true },
    create: {
      name: ADMIN.name,
      email: ADMIN.email,
      emailVerified: true,
      role: "admin",
      country: "Bangladesh",
      status: "active",
      referralCode: "ADMIN",
    },
  });

  // Better Auth stores the password hash on the credential account.
  const passwordHash = await hashPassword(ADMIN.password);
  const credential = await prisma.account.findFirst({
    where: { userId: admin.id, providerId: "credential" },
  });
  if (credential) {
    await prisma.account.update({
      where: { id: credential.id },
      data: { password: passwordHash },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: admin.id,
        providerId: "credential",
        issuer: "local:credential",
        accountId: admin.id,
        password: passwordHash,
      },
    });
  }
  return admin;
}

async function main() {
  console.log("Seeding TaskHub…");
  await seedSettings();
  const { created, removed } = await seedRateCard();
  console.log(
    `Rate card: ${created} new price(s), ${removed} retired, ${RATE_CARD_ENTRIES.length} total.`,
  );
  const admin = await seedSuperAdmin();
  console.log(`Super admin ready: ${admin.email} / ${ADMIN.password}`);
  console.log("Change the password after the first sign-in.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
