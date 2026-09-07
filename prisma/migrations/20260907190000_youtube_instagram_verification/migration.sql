-- Verification for the two platforms Facebook's follower count could not cover.
--
-- YouTube is checked directly: with a worker's own read-only token we can ask
-- whether that worker subscribes to a given channel, so a subscribe campaign
-- needs no buyer-side connection at all — only the channel id it targets.
--
-- Instagram cannot be asked that question by anyone, so it is settled the way
-- Facebook is: against the follower count of the business account behind a
-- connected page.

-- How firmly a worker's linked account is held.
CREATE TYPE "LinkMethod" AS ENUM ('oauth', 'claimed');

-- The account a direct check asks about — a YouTube channel id today.
ALTER TABLE "Campaign" ADD COLUMN "targetRef" TEXT;

-- The Instagram business account attached to a connected page.
ALTER TABLE "FacebookPage" ADD COLUMN "instagramId" TEXT;
ALTER TABLE "FacebookPage" ADD COLUMN "instagramUsername" TEXT;
ALTER TABLE "FacebookPage" ADD COLUMN "instagramFollowers" INTEGER;

CREATE UNIQUE INDEX "FacebookPage_instagramId_key" ON "FacebookPage"("instagramId");

-- One page can back both a Facebook and an Instagram campaign, so a sample has
-- to say which count it is a reading of. Everything recorded so far was a page.
ALTER TABLE "PageFollowerSample"
    ADD COLUMN "platform" "Platform" NOT NULL DEFAULT 'facebook';

DROP INDEX "PageFollowerSample_pageId_takenAt_idx";
CREATE INDEX "PageFollowerSample_pageId_platform_takenAt_idx"
    ON "PageFollowerSample"("pageId", "platform", "takenAt");

-- A worker's linked account grows a handle, a strength, and — for the
-- providers that can answer a direct check — the tokens to run one with.
-- Existing rows all came from Facebook Login, so they are oauth links.
ALTER TABLE "SocialAccount" ADD COLUMN "username" TEXT;
ALTER TABLE "SocialAccount"
    ADD COLUMN "linkMethod" "LinkMethod" NOT NULL DEFAULT 'oauth';
ALTER TABLE "SocialAccount" ADD COLUMN "accessToken" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN "refreshToken" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "SocialAccount" ADD COLUMN "scope" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN "lastError" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN "lastCheckedAt" TIMESTAMP(3);
