-- Tracks whether the person actually picked their role. Google sign-ups get
-- the default "worker" without ever choosing, so they are sent through
-- /setup-role on their first login.
ALTER TABLE "User" ADD COLUMN "roleChosen" BOOLEAN NOT NULL DEFAULT false;

-- Everyone who already exists was created with an explicit role (email
-- sign-up or the seed), so nothing should be re-asked.
UPDATE "User" SET "roleChosen" = true;
