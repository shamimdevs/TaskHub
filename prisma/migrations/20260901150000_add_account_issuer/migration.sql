-- Better Auth 1.7 requires an `issuer` on Account and keys uniqueness on
-- (issuer, accountId) instead of (providerId, accountId).

-- 1. Add the column, backfill existing rows, then enforce NOT NULL.
ALTER TABLE "public"."Account" ADD COLUMN "issuer" TEXT;

UPDATE "public"."Account"
  SET "issuer" = 'local:credential'
  WHERE "providerId" = 'credential';

UPDATE "public"."Account"
  SET "issuer" = 'local:oauth:' || "providerId"
  WHERE "issuer" IS NULL;

ALTER TABLE "public"."Account" ALTER COLUMN "issuer" SET NOT NULL;

-- 2. Swap the unique constraint.
DROP INDEX "public"."Account_providerId_accountId_key";
CREATE UNIQUE INDEX "Account_issuer_accountId_key" ON "public"."Account"("issuer", "accountId");

-- 3. Keep provider lookups fast.
CREATE INDEX "Account_providerId_idx" ON "public"."Account"("providerId");
