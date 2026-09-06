-- Hands-off Facebook follow campaigns.
--
-- Facebook exposes no API for *who* follows a page, so verification runs on the
-- one signal it does give: the page's follower count. A buyer connects their
-- page, the campaign records the count it started from, and a poller settles
-- submissions against the delta (and reverses drops inside the hold window).

CREATE TABLE "FacebookPage" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "accessToken" TEXT NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacebookPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacebookPage_pageId_key" ON "FacebookPage"("pageId");
CREATE INDEX "FacebookPage_ownerId_idx" ON "FacebookPage"("ownerId");

ALTER TABLE "FacebookPage" ADD CONSTRAINT "FacebookPage_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PageFollowerSample" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "followers" INTEGER NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageFollowerSample_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PageFollowerSample_pageId_takenAt_idx" ON "PageFollowerSample"("pageId", "takenAt");

ALTER TABLE "PageFollowerSample" ADD CONSTRAINT "PageFollowerSample_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES "FacebookPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Campaigns remember which page they are checked against and where they started.
ALTER TABLE "Campaign"
    ADD COLUMN "pageId" TEXT,
    ADD COLUMN "baselineFollowers" INTEGER;

CREATE INDEX "Campaign_pageId_idx" ON "Campaign"("pageId");

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES "FacebookPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Submissions record whether a person or the checker cleared them.
ALTER TABLE "Submission" ADD COLUMN "autoVerified" BOOLEAN NOT NULL DEFAULT false;

-- Platform-wide switches for the checker.
ALTER TABLE "PlatformSettings"
    ADD COLUMN "autoVerify" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "autoVerifyGraceMins" INTEGER NOT NULL DEFAULT 45;
