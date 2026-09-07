-- A claimed handle can now prove itself without the platform's app
-- credentials: the worker puts a one-time code on their public profile and the
-- checker reads it back. That is genuine proof of control, so it earns its own
-- LinkMethod rather than being folded into either of the existing two.
ALTER TYPE "LinkMethod" ADD VALUE 'code' BEFORE 'claimed';

ALTER TABLE "SocialAccount" ADD COLUMN "verifyCode" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN "verifyCodeAt" TIMESTAMP(3);
