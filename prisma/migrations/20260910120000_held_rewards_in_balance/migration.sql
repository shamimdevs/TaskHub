-- Verified task rewards go straight into the main balance.
--
-- Until now an approved submission sat `on_hold` with its reward parked in
-- `pendingBalance`, outside the balance, and only moved across when the hold
-- elapsed. Now a verified submission is `approved` ("Complete") at once and its
-- reward is credited to `balance` immediately; the hold only limits what can be
-- withdrawn. `heldBalance` is the part of `balance` still inside a hold.

-- 1. Money already on hold joins the balance, and counts as earned.
UPDATE "User"
SET "balance"        = "balance" + "pendingBalance",
    "lifetimeEarned" = "lifetimeEarned" + "pendingBalance";

-- Same number, new meaning: it is now a subset of `balance`, not an addition.
ALTER TABLE "User" RENAME COLUMN "pendingBalance" TO "heldBalance";

-- The held credits were posted as `pending` ledger rows; they are real now.
UPDATE "WalletTransaction"
SET "status" = 'completed'
WHERE "type" = 'task_reward' AND "status" = 'pending';

-- 2. Track the release per submission instead of by status.
ALTER TABLE "Submission" ADD COLUMN "releasedAt" TIMESTAMP(3);

-- Already-released rewards were `approved`; they stay approved, marked released.
UPDATE "Submission"
SET "releasedAt" = LEAST(COALESCE("reviewedAt", "holdUntil"), "holdUntil")
WHERE "status" = 'approved';

-- Still-held ones become approved with `releasedAt` left null.
UPDATE "Submission" SET "status" = 'approved' WHERE "status" = 'on_hold';

-- 3. Drop `on_hold` from the enum. Postgres cannot remove an enum value in
-- place, so the type is rebuilt.
ALTER TYPE "SubmissionStatus" RENAME TO "SubmissionStatus_old";
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'approved', 'rejected', 'reversed');
ALTER TABLE "Submission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Submission"
    ALTER COLUMN "status" TYPE "SubmissionStatus"
    USING ("status"::text::"SubmissionStatus");
ALTER TABLE "Submission" ALTER COLUMN "status" SET DEFAULT 'pending';
DROP TYPE "SubmissionStatus_old";
