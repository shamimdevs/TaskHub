-- Workers link their own social accounts, so a task proof is tied to a real
-- profile instead of a pasted link, and one profile cannot farm the same task
-- through several TaskHub accounts.
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "Platform" NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profileUrl" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialAccount_provider_providerId_key" ON "SocialAccount"("provider", "providerId");
CREATE UNIQUE INDEX "SocialAccount_userId_provider_key" ON "SocialAccount"("userId", "provider");
CREATE INDEX "SocialAccount_userId_idx" ON "SocialAccount"("userId");

ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
