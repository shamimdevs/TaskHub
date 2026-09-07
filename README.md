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
npm run db:seed:demo    # optional — a populated app to click through
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

## Automation — who actually followed

There are only two honest ways to know whether a worker did what they were paid
for, and **which one applies is decided by the platform, not by us**. The code
splits along exactly that line (`src/lib/domain/verification.ts`), and so does
the UI — a worker is told which kind of check their proof will get.

| Platform | Check | What it actually proves |
| --- | --- | --- |
| YouTube (subscribe) | **Direct** — ask YouTube, as that worker | This worker subscribes to this channel |
| Facebook (follow) | **Count** — the page's follower count moved | Someone followed; who is inferred |
| Instagram (follow) | **Count** — the business account's follower count moved | Someone followed; who is inferred |

Everything else still goes through the human review queue.

`POST /api/cron/verify` (every few minutes, `CRON_SECRET`) runs both passes and
then releases every reward whose hold has elapsed. It recomputes from database
state, so repeating it is a no-op. Turn it all off with **autoVerify** in
/admin/settings.

### Direct — YouTube

YouTube is the only platform here that will answer the real question.
`subscriptions.list?mine=true&forChannelId=<id>` runs with the *worker's* own
read-only token and says plainly whether they subscribe. Consequences worth
knowing:

- **The buyer connects nothing.** Creating a **youtube + subscribe** campaign
  resolves the channel id straight out of the pasted link (`Campaign.targetRef`)
  and goes live immediately. A `/channel/UC…` link resolves with no credentials;
  an `@handle` needs `YOUTUBE_API_KEY`, and without it the campaign simply falls
  back to manual review.
- **A private subscription list is not an obstacle** — we read the worker's own
  subscriptions with the worker's own token.
- **One filtered call per submission**, not a scan, however many thousands of
  channels the worker follows.
- **Unsubscribing during the hold is caught by name**, not inferred from a
  number that fell.
- **No answer is not a rejection.** A worker with no linked YouTube account, or
  a revoked token, is *deferred*: the submission stays pending for a human. Only
  a definite "not subscribed", after the grace window, is turned down.

### Count — Facebook and Instagram

Neither platform will say *who* follows an account, at any price (`user_likes`
went in Graph API v3.0; Instagram's Basic Display API was shut down in December
2024). All that is left is the account's own follower count.

1. The buyer connects their page once — `/api/integrations/facebook/connect` →
   Facebook Login → one `FacebookPage` row per page, each with its own token.
   `instagram_basic` also captures the **Instagram business account** behind the
   page, which is the only thing an Instagram campaign can be measured against;
   a page without one cannot host an Instagram campaign, and the form says so.
2. Creating a **facebook/instagram + follow** campaign against a connected
   account records the live count as `baselineFollowers` and goes live with no
   review. The task link is the connected account itself, so workers can only be
   sent to what is being measured.
3. Each pass polls the account, records a `PageFollowerSample` (tagged with the
   platform, since one page can back both kinds of campaign), and settles:

   ```
   room = (followers - baseline) - (already cleared)
   ```

   Oldest pending submission first: while there is room, clear it into the hold;
   with no room and the grace window (`autoVerifyGraceMins`, default 45) elapsed,
   turn it down. If the count falls below what was already cleared someone
   unfollowed, so the newest still-held rewards are reversed, newest first.
   Rewards past their hold are final — the hold window _is_ the guarantee period.

Everything the checker does is recorded on the submission: `autoVerified = true`,
`reviewedById = null`, and a plain-English `reviewerNote`.

### Connected accounts (worker side)

A worker links their accounts from **/worker/profile**:

| Provider | Route | Notes |
| --- | --- | --- |
| YouTube | `/api/integrations/youtube/connect` | Google OAuth, `youtube.readonly`, offline. The refresh token is the point — without one the checker goes quiet an hour after linking. |
| Facebook | `/api/integrations/facebook/connect?as=profile` | Shares one app and redirect URI with the buyer page flow; the state cookie carries which. |
| Instagram | `/api/integrations/instagram/connect` | Business/Creator accounts only. |

Linking is what makes a proof mean anything:

- the profile link on every submission comes from the linked account, so there
  is nothing to type and nothing to fake — `createSubmission` ignores whatever
  URL was posted when an account is linked for that platform;
- `SocialAccount` is unique on `(provider, providerId)`, so one social account
  can only ever belong to one TaskHub worker, and unique on `(userId, provider)`,
  so a worker keeps exactly one account per platform;
- unlinking leaves past submissions untouched — they keep the link they were
  sent with.

Connected accounts live at **/worker/accounts** (its own nav entry); the
profile page links across to it.

**Claimed handles.** Instagram Login authorises only Business and Creator
accounts, so most workers cannot complete it at all. Those workers instead type
their handle (`POST /api/integrations/social`), stored as
`claimed:<platform>:<handle>` with `linkMethod: "claimed"`. It proves nothing on
its own — the card labels it *Self-declared* — but it still reserves the
account, which is what stops one handle farming a task through twenty TaskHub
accounts. A later OAuth link displaces anyone else's claim on that handle:
whoever proves it beats whoever typed it.

**Profile codes — claims that settle themselves.** A self-declared account with
no way to ever become verified is a dead end, so where the public profile can be
read back, the claim issues a one-time `TASKHUB-XXXXXX` code. The worker pastes
it into their profile; `runProfileCodeVerification()` reads it back on the same
cron pass as everything else and promotes the account to
`linkMethod: "code"` — real proof of control, with no app credentials involved.
`POST /api/integrations/social/:id/check` runs the same check on demand for
anyone who does not want to wait.

This works for **YouTube only**, and needs only `YOUTUBE_API_KEY` — the Data API
returns a channel's public description for a plain API key. Facebook and
Instagram serve a login wall to anything that is not their own app, so there is
no honest way to read a code there; those stay self-declared until
`FACEBOOK_APP_ID`/`INSTAGRAM_APP_ID` are set, and the panel says exactly that
instead of implying the worker did something wrong.

Note the ceiling: a code-verified YouTube account proves the channel is theirs
but carries no token, so it still cannot take an auto-checked **subscribe**
task — `createSubmission` requires a refresh token for any campaign with a
`targetRef`. The card says so rather than letting them find out by being stuck.

| `linkMethod` | How | Verified badge | Can auto-check subscribes |
| --- | --- | --- | --- |
| `oauth` | Platform confirmed it | yes | yes (YouTube) |
| `code` | Code read off the public profile | yes | no |
| `claimed` | Typed, nothing checked | no | no |

Facebook only returns a usable profile URL with the `user_link` permission
(App Review), so a worker may be asked to paste their profile link once; it is
stored on the linked account and reused from then on.

## Demo data

`npm run db:seed:demo` fills a fresh install with people, campaigns, tasks,
submissions and — the part that is otherwise hard to see — **connected accounts
in every verification state**, without a single OAuth app configured.

Every demo user is `<name>@demo.taskhub.test`, password `Password123!`
(override with `SEED_DEMO_PASSWORD`). Rows are upserted on a stable key, so
re-running replaces the demo rather than stacking a second copy, and nothing
outside the demo domain is touched. It refuses to run with
`NODE_ENV=production`.

Sign in as each worker to see a different state on **/worker/accounts**:

| Worker | What their accounts show |
| --- | --- |
| `rakib` | YouTube linked with a token — the only state that can take auto-checked subscribe tasks. Instagram self-declared. |
| `nusrat` | YouTube mid-verification: the `TASKHUB-…` code is on screen and the cron is watching for it. Facebook linked but missing its profile link. |
| `tanvir` | YouTube proved by profile code — verified, but no token, so the card explains subscribe tasks still need the full connection. |
| `shila` | YouTube grant revoked — the reconnect warning. |

Buyers `brandhub` and `greenleaf` own the campaigns. `yt-subs` carries a
`targetRef`, so it is the one settled worker-by-worker; the Facebook one is
settled by follower count. Submissions are seeded across pending / on-hold /
approved / rejected, including a *deferred* one — a worker the checker could
not get an answer for, left for a human rather than refused.

The tokens are placeholders, so a real call to Google will fail and say so.
That is deliberate: it is also the honest demo of what a revoked grant looks
like. Add `YOUTUBE_API_KEY` and re-link to see checks actually succeed.

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
| `npm run db:seed:demo` | add demo people, campaigns and linked accounts |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | drop, re-migrate, re-seed |
