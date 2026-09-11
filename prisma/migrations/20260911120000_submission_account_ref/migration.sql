-- Which linked account a submission was made with, and when the platform last
-- confirmed it.
--
-- `accountRef` closes a farming hole on directly-checked (YouTube) tasks: one
-- channel could subscribe once, submit from worker A, be unlinked, relinked to
-- worker B and submit the same task again — the subscription is still there,
-- so B's check passed too. Recording the channel id lets `createSubmission`
-- refuse a second reward for the same channel on the same campaign.
--
-- `lastCheckedAt` lets held rewards be re-checked every few hours instead of
-- on every cron pass, which was spending YouTube quota for answers we had.
ALTER TABLE "Submission" ADD COLUMN "accountRef" TEXT;
ALTER TABLE "Submission" ADD COLUMN "lastCheckedAt" TIMESTAMP(3);

CREATE INDEX "Submission_campaignId_accountRef_idx"
    ON "Submission"("campaignId", "accountRef");
