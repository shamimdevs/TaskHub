# TaskHub

Micro-task marketplace — workers earn Taka completing social tasks, buyers buy
real human engagement, admins run the platform.

Stack: **Next.js 16 (App Router)** · **PostgreSQL + Prisma** · **Better Auth**
(email/password + email verification + Google OAuth) · **Redux Toolkit / RTK Query** ·
**Tailwind v4** · **Resend** for transactional email.

## Local setup

### 1. Database

Create a database and role in your local PostgreSQL, then point `DATABASE_URL` at it:

```bash
psql -U postgres -c "CREATE ROLE taskhub LOGIN PASSWORD 'taskhub';"
psql -U postgres -c "CREATE DATABASE taskhub OWNER taskhub;"
```

### 2. Environment

```bash
cp .env.example .env
```

Fill in `.env`:

| var | required | notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `postgresql://taskhub:taskhub@localhost:5432/taskhub?schema=public` |
| `BETTER_AUTH_SECRET` | yes | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL` | yes | `http://localhost:3000` in dev |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for Google login | redirect URI `http://localhost:3000/api/auth/callback/google` |
| `AUTH_STATIC_OTP` | no | every auth code is this value (default `123456`); set `""` for random codes |
| `MAIL_ENABLED` | for real email | `false` by default — mail is printed to the server console, never sent |
| `MAIL_HOST` / `MAIL_USERNAME` / `MAIL_PASSWORD` | with `MAIL_ENABLED=true` | SMTP credentials (Gmail: use an App Password) |
| `CRON_SECRET` | yes | bearer token for `POST /api/cron/release` |

### 3. Migrate + seed

```bash
npm install
npm run db:migrate      # first run: prisma migrate dev --name init
npm run db:seed
```

Seed creates exactly three things: the **super admin** account, the platform
settings row (dollar rate, limits, withdrawal commission) and the **rate card**
— one USD price per platform + action. No demo users, campaigns or
transactions; everything else comes from real sign-ups. Re-seeding only fills
in prices that do not exist yet, so tuned rates survive.

Default admin: `admin@taskhub.com.bd` / `Password123!`. Override with
`SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env`, and
change the password after the first sign-in. Re-running the seed is safe — it
upserts and never touches settings the admin has since edited.

### 4. Run

```bash
npm run dev
```

## Auth flows

Verification and password reset run on **6-digit codes**, not links (Better Auth's
`emailOTP` plugin with `overrideDefaultEmailVerification`).

> **No mail is sent right now.** `MAIL_ENABLED` is `false`, so messages are only
> printed to the server console, and `AUTH_STATIC_OTP` makes every code
> **`123456`**. To go live: set `AUTH_STATIC_OTP=""` (random codes),
> `MAIL_ENABLED=true`, and fill in the `MAIL_*` credentials.

- **Sign up** (`/register`) — pick worker or buyer, land on `/verify-email`, type
  the code, get signed in on the role dashboard. Admins are seed/CLI only.
- **Google** — one tap, then `/setup-role`, because Google sends no role.
- **Role setup** (`/setup-role`) — accounts that never picked a side (`roleChosen
  = false`) must answer worker-or-buyer before any panel opens; `requireRole`
  redirects them there. Anyone who has already chosen — and every admin — is
  forwarded straight to their dashboard, which makes it a safe universal
  landing page after social sign-in. The pick is **write-once**
  (`POST /api/session/role`); switching sides later is not self-service.
- **Forgot / reset password** — `/forgot-password` → `/reset-password` → email +
  code + new password.
- **Change password** — Profile → Security card (`revokeOtherSessions` on).

`role` can only be set at sign-up (worker/buyer only — the create hook forces
it) or through the one-time endpoint. A `user.update.before` hook aborts any
`updateUser` call carrying `role`/`roleChosen`, so the self-service profile
endpoint cannot be used to change sides or self-promote to admin.

Route protection: `src/proxy.ts` does optimistic cookie redirects; the
`(worker|buyer|admin)` layouts do the authoritative `requireRole` check; API route
handlers call `requireApiUser` / `requireApiRole`.

## Money and rates

Wallets, rewards and campaign costs are all **US dollars**, and dollars are the
only currency the UI shows — `formatMoney` everywhere.

Local cash is the exception, and it is confined to the two screens where real
money actually moves: **deposit** and **withdraw** (plus their admin review
queues, and the exchange-rate field in settings). A bKash/Nagad top-up is
converted at `PlatformSettings.usdRate` (BDT per $1) and a payout is sent back
at the same rate; `formatBdt` / `toBdt` / `toUsd` belong to those screens and
nowhere else. Each deposit and withdrawal stores the rate it was created with,
so changing the rate never re-prices a request already in the queue.

Prices live in the **rate card** — one USD amount per (platform, action), e.g.
YouTube subscribe, YouTube watch time (per hour), Facebook like. The buyer pays
that rate and the worker earns the same: the platform's only income is the
withdrawal commission (`withdrawFeePct`). Admins edit the dollar rate, the
limits and every price at **/admin/settings**; an action can also be switched
off there, which hides it from the campaign form.

Defaults for a fresh install live in `src/lib/constants.ts` (`USD_RATE`,
`RATE_CARD`, `LIMITS`, `FEES`).

## Automation — Facebook follows

Facebook follow campaigns run without anyone touching them. **Facebook exposes
no API for _who_ follows a page** (`user_likes` was removed in Graph API v3.0),
so verification uses the one number it does give: the page's follower count.

1. The buyer connects their page once — `/api/integrations/facebook/connect` →
   Facebook Login (`pages_show_list`, `pages_read_engagement`) → the callback
   stores one `FacebookPage` row per page, each with its own page token.
2. Creating a **facebook + follow** campaign against a connected page reads the
   live follower count as `baselineFollowers` and puts the campaign straight to
   `active` — no review queue. The task link is the connected page itself, so
   workers can only be sent to the account being measured.
3. `POST /api/cron/verify` (every few minutes, `CRON_SECRET`) polls each page,
   records a `PageFollowerSample`, and settles every live campaign:

   ```
   room = (followers - baseline) - (already cleared)
   ```

   Oldest pending submission first: while there is room, clear it into the hold;
   with no room and the grace window (`autoVerifyGraceMins`, default 45) elapsed,
   turn it down. If the count falls below what was already cleared someone
   unfollowed, so the newest still-held rewards are reversed, newest first.
   Rewards past their hold are final — the hold window _is_ the guarantee period.
4. The same call releases every reward whose hold has elapsed, so the dollars
   land in the worker's spendable balance on their own, and a campaign that has
   delivered its quantity flips to `completed`.

Everything the checker does is recorded on the submission: `autoVerified = true`,
`reviewedById = null`, and a plain-English `reviewerNote`. The run recomputes
from database state, so repeating it is a no-op.

Turn it all off with **autoVerify** in /admin/settings; campaigns then fall back
to the manual review queue. Without `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET` the
connect button is hidden and every campaign is manual.

### Connected accounts (worker side)

A worker links their own Facebook account from **/worker/profile** →
`/api/integrations/facebook/connect?as=profile`. Both flows share one app and
one redirect URI; the state cookie carries which one it was.

Linking is what makes a proof mean anything:

- the profile link on every submission comes from the linked account, so there
  is nothing to type and nothing to fake — `createSubmission` ignores whatever
  URL was posted when an account is linked for that platform;
- `SocialAccount` is unique on `(provider, providerId)`, so one Facebook account
  can only ever belong to one TaskHub worker, and unique on `(userId, provider)`,
  so a worker keeps exactly one account per platform;
- unlinking leaves past submissions untouched — they keep the link they were
  sent with.

Facebook only returns a usable profile URL with the `user_link` permission
(App Review), so a worker may be asked to paste their profile link once; it is
stored on the linked account and reused from then on. Instagram and YouTube are
listed in the card but not connectable yet.

Other platforms and actions still go through the human queue — the count-based
check only makes sense where the target is a page whose followers we can read.

## Reward holds

Approved task rewards sit in `pendingBalance` until their hold window elapses, then
move to spendable `balance`. Release runs opportunistically on wallet/submission
reads, and on demand:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/release
```

Wire that to a scheduler (cron / Vercel Cron / GitHub Action) in production.

## Scripts

| script | what |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` (production) |
| `npm run db:seed` | create the super admin, settings + rate card |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | drop, re-migrate, re-seed |
