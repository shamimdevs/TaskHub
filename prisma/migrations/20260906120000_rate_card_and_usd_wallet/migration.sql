-- Per-platform / per-action rate card + USD wallet.
--
-- The wallet currency becomes USD. Deposits still arrive in BDT over
-- bKash/Nagad and are converted at PlatformSettings.usdRate, which the admin
-- can change at any time; each deposit and withdrawal stores the rate it was
-- created with so a later change never rewrites past money.

-- 1. New action types ------------------------------------------------------
ALTER TYPE "TaskType" ADD VALUE 'view';
ALTER TYPE "TaskType" ADD VALUE 'watch_time';

-- 2. Rate card -------------------------------------------------------------
CREATE TABLE "RateCard" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "type" "TaskType" NOT NULL,
    "rate" DECIMAL(14,4) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateCard_platform_type_key" ON "RateCard"("platform", "type");
CREATE INDEX "RateCard_enabled_idx" ON "RateCard"("enabled");

-- 3. Settings: flat rates out, exchange rate in ----------------------------
ALTER TABLE "PlatformSettings"
    DROP COLUMN "clientRatePer1k",
    DROP COLUMN "workerRewardPerAction",
    ADD COLUMN "usdRate" DECIMAL(14,2) NOT NULL DEFAULT 120,
    ADD COLUMN "minDeposit" DECIMAL(14,2) NOT NULL DEFAULT 1;

ALTER TABLE "PlatformSettings"
    ALTER COLUMN "referralBonus" TYPE DECIMAL(14,4);

-- Existing BDT limits -> USD at the default rate.
UPDATE "PlatformSettings"
   SET "minWithdraw"   = ROUND("minWithdraw" / 120, 2),
       "referralBonus" = ROUND("referralBonus" / 120, 4);

ALTER TABLE "PlatformSettings"
    ALTER COLUMN "usdRate" DROP DEFAULT,
    ALTER COLUMN "minDeposit" DROP DEFAULT;

-- 4. Deposits: BDT in, USD credited ----------------------------------------
ALTER TABLE "Deposit"
    ADD COLUMN "amountBdt" DECIMAL(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN "usdRate" DECIMAL(14,2) NOT NULL DEFAULT 120;

-- Pre-existing rows held taka in "amount"; keep it as the BDT figure and
-- credit the USD equivalent.
UPDATE "Deposit"
   SET "amountBdt" = "amount",
       "amount"    = ROUND("amount" / 120, 2);

ALTER TABLE "Deposit"
    ALTER COLUMN "amountBdt" DROP DEFAULT,
    ALTER COLUMN "usdRate" DROP DEFAULT;

-- 5. Withdrawals: USD requested, BDT paid out ------------------------------
ALTER TABLE "Withdrawal"
    ADD COLUMN "usdRate" DECIMAL(14,2) NOT NULL DEFAULT 120,
    ADD COLUMN "payoutBdt" DECIMAL(14,2) NOT NULL DEFAULT 0;

UPDATE "Withdrawal"
   SET "payoutBdt" = "net",
       "amount"    = ROUND("amount" / 120, 2),
       "fee"       = ROUND("fee" / 120, 2),
       "net"       = ROUND("net" / 120, 2);

ALTER TABLE "Withdrawal"
    ALTER COLUMN "usdRate" DROP DEFAULT,
    ALTER COLUMN "payoutBdt" DROP DEFAULT;

-- 6. Wallets and money columns that were taka ------------------------------
UPDATE "User"
   SET "balance"        = ROUND("balance" / 120, 2),
       "pendingBalance" = ROUND("pendingBalance" / 120, 2),
       "lifetimeEarned" = ROUND("lifetimeEarned" / 120, 2),
       "lifetimeSpent"  = ROUND("lifetimeSpent" / 120, 2);

UPDATE "WalletTransaction"
   SET "amount"       = ROUND("amount" / 120, 2),
       "balanceAfter" = ROUND("balanceAfter" / 120, 2);

UPDATE "Campaign"
   SET "ratePerAction" = ROUND("ratePerAction" / 120, 4),
       "workerReward"  = ROUND("workerReward" / 120, 4),
       "totalCost"     = ROUND("totalCost" / 120, 2);

UPDATE "Task"       SET "reward" = ROUND("reward" / 120, 4);
UPDATE "Submission" SET "reward" = ROUND("reward" / 120, 4);
UPDATE "Referral"   SET "earnedForYou" = ROUND("earnedForYou" / 120, 2);
