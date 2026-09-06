-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."CampaignStatus" AS ENUM ('draft', 'pending_review', 'active', 'paused', 'completed', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."NotificationKind" AS ENUM ('info', 'success', 'warning', 'danger');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('bkash', 'nagad', 'rocket', 'manual');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('pending', 'approved', 'rejected', 'paid');

-- CreateEnum
CREATE TYPE "public"."Platform" AS ENUM ('facebook', 'instagram', 'youtube', 'tiktok', 'twitter');

-- CreateEnum
CREATE TYPE "public"."ReferralStatus" AS ENUM ('joined', 'active', 'qualified');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('worker', 'buyer', 'admin');

-- CreateEnum
CREATE TYPE "public"."SubmissionStatus" AS ENUM ('pending', 'on_hold', 'approved', 'rejected', 'reversed');

-- CreateEnum
CREATE TYPE "public"."TaskType" AS ENUM ('follow', 'like', 'subscribe', 'comment', 'share', 'join_group');

-- CreateEnum
CREATE TYPE "public"."TxnDirection" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "public"."TxnState" AS ENUM ('completed', 'pending', 'reversed');

-- CreateEnum
CREATE TYPE "public"."TxnType" AS ENUM ('deposit', 'campaign_spend', 'task_reward', 'withdrawal', 'withdrawal_fee', 'referral_bonus', 'penalty', 'adjustment');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('active', 'banned', 'restricted');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Campaign" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "platform" "public"."Platform" NOT NULL,
    "type" "public"."TaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "ratePerAction" DECIMAL(14,4) NOT NULL,
    "workerReward" DECIMAL(14,4) NOT NULL,
    "totalCost" DECIMAL(14,2) NOT NULL,
    "status" "public"."CampaignStatus" NOT NULL DEFAULT 'pending_review',
    "holdDays" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Deposit" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL,
    "senderNumber" TEXT NOT NULL,
    "trxId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "public"."NotificationKind" NOT NULL DEFAULT 'info',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "clientRatePer1k" DECIMAL(14,2) NOT NULL,
    "workerRewardPerAction" DECIMAL(14,4) NOT NULL,
    "minWithdraw" DECIMAL(14,2) NOT NULL,
    "withdrawFeePct" DECIMAL(6,2) NOT NULL,
    "holdDays" INTEGER NOT NULL,
    "referralBonus" DECIMAL(14,2) NOT NULL,
    "autoApproveDeposits" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "name" TEXT NOT NULL,
    "status" "public"."ReferralStatus" NOT NULL DEFAULT 'joined',
    "earnedForYou" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Submission" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "platform" "public"."Platform" NOT NULL,
    "type" "public"."TaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "reward" DECIMAL(14,4) NOT NULL,
    "status" "public"."SubmissionStatus" NOT NULL DEFAULT 'pending',
    "proofUrl" TEXT,
    "proofNote" TEXT,
    "screenshotUrl" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "holdUntil" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewerNote" TEXT,
    "reviewedById" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "platform" "public"."Platform" NOT NULL,
    "type" "public"."TaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "instructions" TEXT[],
    "reward" DECIMAL(14,4) NOT NULL,
    "holdDays" INTEGER NOT NULL,
    "slotsLeft" INTEGER NOT NULL,
    "buyerName" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'worker',
    "phone" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Bangladesh',
    "status" "public"."UserStatus" NOT NULL DEFAULT 'active',
    "banReason" TEXT,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lifetimeEarned" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lifetimeSpent" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "referralCode" TEXT NOT NULL,
    "referredByCode" TEXT,
    "referredById" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."TxnType" NOT NULL,
    "direction" "public"."TxnDirection" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "status" "public"."TxnState" NOT NULL DEFAULT 'completed',
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Withdrawal" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "fee" DECIMAL(14,2) NOT NULL,
    "net" DECIMAL(14,2) NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "public"."Account"("providerId" ASC, "accountId" ASC);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId" ASC);

-- CreateIndex
CREATE INDEX "Campaign_buyerId_idx" ON "public"."Campaign"("buyerId" ASC);

-- CreateIndex
CREATE INDEX "Campaign_createdAt_idx" ON "public"."Campaign"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "public"."Campaign"("status" ASC);

-- CreateIndex
CREATE INDEX "Deposit_buyerId_idx" ON "public"."Deposit"("buyerId" ASC);

-- CreateIndex
CREATE INDEX "Deposit_createdAt_idx" ON "public"."Deposit"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Deposit_status_idx" ON "public"."Deposit"("status" ASC);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "public"."Notification"("userId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "public"."Notification"("userId" ASC, "read" ASC);

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "public"."Referral"("referrerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "public"."Session"("token" ASC);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId" ASC);

-- CreateIndex
CREATE INDEX "Submission_campaignId_idx" ON "public"."Submission"("campaignId" ASC);

-- CreateIndex
CREATE INDEX "Submission_status_holdUntil_idx" ON "public"."Submission"("status" ASC, "holdUntil" ASC);

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "public"."Submission"("status" ASC);

-- CreateIndex
CREATE INDEX "Submission_submittedAt_idx" ON "public"."Submission"("submittedAt" ASC);

-- CreateIndex
CREATE INDEX "Submission_taskId_idx" ON "public"."Submission"("taskId" ASC);

-- CreateIndex
CREATE INDEX "Submission_workerId_idx" ON "public"."Submission"("workerId" ASC);

-- CreateIndex
CREATE INDEX "Task_campaignId_idx" ON "public"."Task"("campaignId" ASC);

-- CreateIndex
CREATE INDEX "Task_slotsLeft_idx" ON "public"."Task"("slotsLeft" ASC);

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "public"."User"("referralCode" ASC);

-- CreateIndex
CREATE INDEX "User_referredById_idx" ON "public"."User"("referredById" ASC);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role" ASC);

-- CreateIndex
CREATE INDEX "User_status_idx" ON "public"."User"("status" ASC);

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "public"."Verification"("identifier" ASC);

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "public"."WalletTransaction"("type" ASC);

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "public"."WalletTransaction"("userId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Withdrawal_createdAt_idx" ON "public"."Withdrawal"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Withdrawal_status_idx" ON "public"."Withdrawal"("status" ASC);

-- CreateIndex
CREATE INDEX "Withdrawal_workerId_idx" ON "public"."Withdrawal"("workerId" ASC);

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Campaign" ADD CONSTRAINT "Campaign_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deposit" ADD CONSTRAINT "Deposit_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Withdrawal" ADD CONSTRAINT "Withdrawal_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

