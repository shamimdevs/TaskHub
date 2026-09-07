/**
 * Demo data — a populated TaskHub you can click through without wiring up a
 * single OAuth app.
 *
 *   npm run db:seed:demo
 *
 * Deliberately separate from `seed.ts`, which stays the minimum a real install
 * needs. This one invents people and money, so it must never run by accident:
 * it refuses outright when NODE_ENV is production.
 *
 * Everything here is upserted on a stable key, so re-running replaces the demo
 * rather than stacking a second copy of it. Real rows are never touched — every
 * demo user lives under the @demo.taskhub.test domain.
 *
 * The point of the exercise is the parts that are otherwise hard to see:
 * connected accounts in each verification state, and campaigns settled by each
 * of the two checkers.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const DOMAIN = "demo.taskhub.test";
const PASSWORD = process.env.SEED_DEMO_PASSWORD || "Password123!";

const day = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * day);
const ahead = (days: number) => new Date(Date.now() + days * day);

/* ------------------------------------------------------------------ *
 * People
 * ------------------------------------------------------------------ */

interface DemoPerson {
  key: string;
  name: string;
  role: "worker" | "buyer";
  balance: number;
  pendingBalance: number;
  lifetimeEarned?: number;
  lifetimeSpent?: number;
}

const PEOPLE: DemoPerson[] = [
  { key: "rakib", name: "Rakib Hasan", role: "worker", balance: 4.62, pendingBalance: 0.34, lifetimeEarned: 12.9 },
  { key: "nusrat", name: "Nusrat Jahan", role: "worker", balance: 1.18, pendingBalance: 0.12, lifetimeEarned: 3.4 },
  { key: "tanvir", name: "Tanvir Ahmed", role: "worker", balance: 0.27, pendingBalance: 0, lifetimeEarned: 0.27 },
  { key: "shila", name: "Shila Akter", role: "worker", balance: 0, pendingBalance: 0 },
  { key: "brandhub", name: "BrandHub BD", role: "buyer", balance: 180.5, pendingBalance: 0, lifetimeSpent: 119.5 },
  { key: "greenleaf", name: "Green Leaf Cafe", role: "buyer", balance: 42.0, pendingBalance: 0, lifetimeSpent: 58.0 },
];

const email = (key: string) => `${key}@${DOMAIN}`;

async function seedPeople() {
  const passwordHash = await hashPassword(PASSWORD);
  const users = new Map<string, string>();

  for (const p of PEOPLE) {
    const user = await prisma.user.upsert({
      where: { email: email(p.key) },
      update: {
        name: p.name,
        role: p.role,
        roleChosen: true,
        status: "active",
        balance: p.balance,
        pendingBalance: p.pendingBalance,
        lifetimeEarned: p.lifetimeEarned ?? 0,
        lifetimeSpent: p.lifetimeSpent ?? 0,
      },
      create: {
        name: p.name,
        email: email(p.key),
        emailVerified: true,
        role: p.role,
        roleChosen: true,
        phone: "+8801700000000",
        country: "Bangladesh",
        status: "active",
        balance: p.balance,
        pendingBalance: p.pendingBalance,
        lifetimeEarned: p.lifetimeEarned ?? 0,
        lifetimeSpent: p.lifetimeSpent ?? 0,
        referralCode: `DEMO${p.key.slice(0, 4).toUpperCase()}`,
        createdAt: ago(30),
      },
    });
    users.set(p.key, user.id);

    const credential = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });
    if (credential) {
      await prisma.account.update({
        where: { id: credential.id },
        data: { password: passwordHash },
      });
    } else {
      await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          issuer: "local:credential",
          accountId: user.id,
          password: passwordHash,
        },
      });
    }
  }
  return users;
}

/* ------------------------------------------------------------------ *
 * Connected accounts — one of every state the panel can show
 * ------------------------------------------------------------------ */

async function seedSocialAccounts(users: Map<string, string>) {
  const rows: (Prisma.SocialAccountUncheckedCreateInput & { userKey: string })[] = [
    // Fully linked: the platform confirmed it and we hold a refresh token, so
    // this worker can take auto-checked subscribe tasks. The token is a
    // placeholder — a real check against Google will fail and say so, which is
    // itself the honest demo of what a revoked grant looks like.
    {
      userKey: "rakib",
      userId: "",
      provider: "youtube",
      providerId: "UCdemoRakibChannel00001",
      name: "Rakib Tech Bangla",
      username: "rakibtechbangla",
      profileUrl: "https://www.youtube.com/@rakibtechbangla",
      linkMethod: "oauth",
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      tokenExpiresAt: ahead(30),
      scope: "https://www.googleapis.com/auth/youtube.readonly",
      connectedAt: ago(12),
    },
    // Mid-verification: the code is issued and the cron is watching for it.
    {
      userKey: "nusrat",
      userId: "",
      provider: "youtube",
      providerId: "claimed:youtube:nusratvlogs",
      name: "@nusratvlogs",
      username: "nusratvlogs",
      linkMethod: "claimed",
      verifyCode: "TASKHUB-K7M2QX",
      verifyCodeAt: ago(0.02),
      connectedAt: ago(0.02),
    },
    // Proved by profile code: verified, but no token — so it still cannot take
    // an auto-checked subscribe task, which the panel says out loud.
    {
      userKey: "tanvir",
      userId: "",
      provider: "youtube",
      providerId: "UCdemoTanvirChannel0002",
      name: "Tanvir Gaming",
      username: "tanvirgaming",
      profileUrl: "https://www.youtube.com/@tanvirgaming",
      linkMethod: "code",
      connectedAt: ago(5),
    },
    // Self-declared: nothing has checked it, and on a server with no Instagram
    // credentials nothing can. It still reserves the handle.
    {
      userKey: "rakib",
      userId: "",
      provider: "instagram",
      providerId: "claimed:instagram:rakib.hasan",
      name: "@rakib.hasan",
      username: "rakib.hasan",
      profileUrl: "https://www.instagram.com/rakib.hasan",
      linkMethod: "claimed",
      connectedAt: ago(9),
    },
    // Facebook via OAuth, but without user_link — so no profile URL yet, and
    // the panel asks for it once.
    {
      userKey: "nusrat",
      userId: "",
      provider: "facebook",
      providerId: "demo-fb-1029384756",
      name: "Nusrat Jahan",
      linkMethod: "oauth",
      connectedAt: ago(7),
    },
    // A stale grant: verified once, broken now. Shows the warning path.
    {
      userKey: "shila",
      userId: "",
      provider: "youtube",
      providerId: "UCdemoShilaChannel00003",
      name: "Shila Kitchen",
      username: "shilakitchen",
      profileUrl: "https://www.youtube.com/@shilakitchen",
      linkMethod: "oauth",
      lastError: "YouTube access was revoked — reconnect to keep proofs automatic",
      lastCheckedAt: ago(0.1),
      connectedAt: ago(20),
    },
  ];

  for (const { userKey, ...row } of rows) {
    const userId = users.get(userKey);
    if (!userId) continue;
    const data = { ...row, userId };
    await prisma.socialAccount.upsert({
      where: { userId_provider: { userId, provider: row.provider } },
      update: data,
      create: data,
    });
  }
  return rows.length;
}

/* ------------------------------------------------------------------ *
 * Campaigns, tasks and submissions
 * ------------------------------------------------------------------ */

interface DemoCampaign {
  key: string;
  buyerKey: string;
  platform: "youtube" | "facebook" | "instagram";
  type: "subscribe" | "follow" | "like";
  title: string;
  targetUrl: string;
  targetRef?: string;
  quantity: number;
  delivered: number;
  rate: number;
  status: "active" | "pending_review" | "completed";
  /** Set on the direct-checked one so the task list mirrors reality. */
  note?: string;
}

const CAMPAIGNS: DemoCampaign[] = [
  {
    key: "yt-subs",
    buyerKey: "brandhub",
    platform: "youtube",
    type: "subscribe",
    title: "Grow our tech review channel",
    targetUrl: "https://www.youtube.com/@brandhubbd",
    // Present, so this campaign is settled worker-by-worker rather than by a
    // follower count. This is the one that shows the strong path.
    targetRef: "UCdemoBrandHubChannel01",
    quantity: 500,
    delivered: 3,
    rate: 0.02,
    status: "active",
    note: "Please stay subscribed for at least a week.",
  },
  {
    key: "fb-follow",
    buyerKey: "greenleaf",
    platform: "facebook",
    type: "follow",
    title: "Follow our cafe page",
    targetUrl: "https://www.facebook.com/greenleafcafebd",
    quantity: 300,
    delivered: 2,
    rate: 0.01,
    status: "active",
  },
  {
    key: "ig-follow",
    buyerKey: "brandhub",
    platform: "instagram",
    type: "follow",
    title: "Instagram launch push",
    targetUrl: "https://www.instagram.com/brandhubbd",
    quantity: 250,
    delivered: 0,
    rate: 0.012,
    status: "pending_review",
  },
  {
    key: "fb-like",
    buyerKey: "greenleaf",
    platform: "facebook",
    type: "like",
    title: "Likes on our iftar post",
    targetUrl: "https://www.facebook.com/greenleafcafebd/posts/1",
    quantity: 100,
    delivered: 100,
    rate: 0.005,
    status: "completed",
  },
];

async function seedCampaigns(users: Map<string, string>) {
  const ids = new Map<string, { campaignId: string; taskId?: string }>();

  for (const c of CAMPAIGNS) {
    const buyerId = users.get(c.buyerKey)!;
    const buyer = PEOPLE.find((p) => p.key === c.buyerKey)!;
    const totalCost = +(c.rate * c.quantity).toFixed(2);

    // Campaign has no natural unique key, so key the demo rows off the title.
    const existing = await prisma.campaign.findFirst({
      where: { buyerId, title: c.title },
      select: { id: true },
    });

    const data = {
      buyerId,
      buyerName: buyer.name,
      platform: c.platform,
      type: c.type,
      title: c.title,
      targetUrl: c.targetUrl,
      targetRef: c.targetRef ?? null,
      quantity: c.quantity,
      delivered: c.delivered,
      ratePerAction: c.rate,
      workerReward: c.rate,
      totalCost,
      status: c.status,
      holdDays: 3,
      note: c.note ?? null,
      createdAt: ago(14),
    };

    const campaign = existing
      ? await prisma.campaign.update({ where: { id: existing.id }, data })
      : await prisma.campaign.create({ data });

    let taskId: string | undefined;
    if (c.status === "active") {
      const task = await prisma.task.findFirst({
        where: { campaignId: campaign.id },
        select: { id: true },
      });
      const taskData = {
        campaignId: campaign.id,
        platform: c.platform,
        type: c.type,
        title: c.title,
        targetUrl: c.targetUrl,
        instructions: [
          "Open the link in your browser or app",
          "Log in with your real, active account",
          c.type === "subscribe" ? "Subscribe to the channel" : "Follow the page",
          "Come back and submit — we check it automatically",
        ],
        reward: c.rate,
        holdDays: 3,
        slotsLeft: c.quantity - c.delivered,
        buyerName: buyer.name,
        expiresAt: ahead(21),
      };
      taskId = task
        ? (await prisma.task.update({ where: { id: task.id }, data: taskData })).id
        : (await prisma.task.create({ data: taskData })).id;
    }

    ids.set(c.key, { campaignId: campaign.id, taskId });
  }
  return ids;
}

async function seedSubmissions(
  users: Map<string, string>,
  campaigns: Map<string, { campaignId: string; taskId?: string }>,
) {
  const rows: {
    campaignKey: string;
    workerKey: string;
    status: "pending" | "on_hold" | "approved" | "rejected";
    autoVerified: boolean;
    note?: string;
    daysAgo: number;
  }[] = [
    // Cleared by the direct YouTube check.
    { campaignKey: "yt-subs", workerKey: "rakib", status: "on_hold", autoVerified: true, note: "Confirmed on your YouTube subscriptions.", daysAgo: 1 },
    // Waiting: this worker has no usable token, so the checker defers to a
    // human rather than refusing something it could not see.
    { campaignKey: "yt-subs", workerKey: "tanvir", status: "pending", autoVerified: false, daysAgo: 0.05 },
    // Refused, and the reason is specific because the check was direct.
    { campaignKey: "yt-subs", workerKey: "shila", status: "rejected", autoVerified: true, note: "Your YouTube account is not subscribed to this channel.", daysAgo: 2 },
    // Released — the hold elapsed and the money moved to spendable.
    { campaignKey: "yt-subs", workerKey: "nusrat", status: "approved", autoVerified: true, note: "Confirmed on your YouTube subscriptions.", daysAgo: 8 },
    // Count-checked side.
    { campaignKey: "fb-follow", workerKey: "rakib", status: "on_hold", autoVerified: true, note: "Confirmed by follower count.", daysAgo: 1 },
    { campaignKey: "fb-follow", workerKey: "nusrat", status: "pending", autoVerified: false, daysAgo: 0.02 },
  ];

  let made = 0;
  for (const r of rows) {
    const target = campaigns.get(r.campaignKey);
    const workerId = users.get(r.workerKey);
    if (!target?.taskId || !workerId) continue;

    const worker = PEOPLE.find((p) => p.key === r.workerKey)!;
    const campaign = CAMPAIGNS.find((c) => c.key === r.campaignKey)!;

    const existing = await prisma.submission.findFirst({
      where: { taskId: target.taskId, workerId },
      select: { id: true },
    });

    const data = {
      taskId: target.taskId,
      campaignId: target.campaignId,
      workerId,
      workerName: worker.name,
      platform: campaign.platform,
      type: campaign.type,
      title: campaign.title,
      reward: campaign.rate,
      status: r.status,
      proofUrl: `https://www.youtube.com/@${r.workerKey}`,
      submittedAt: ago(r.daysAgo),
      holdUntil: ahead(3 - r.daysAgo),
      reviewedAt: r.status === "pending" ? null : ago(r.daysAgo),
      reviewerNote: r.note ?? null,
      autoVerified: r.autoVerified,
    };

    if (existing) await prisma.submission.update({ where: { id: existing.id }, data });
    else await prisma.submission.create({ data });
    made++;
  }
  return made;
}

/* ------------------------------------------------------------------ *
 * Money and messages — enough for the admin queues to have something in them
 * ------------------------------------------------------------------ */

async function seedMoney(users: Map<string, string>) {
  const brandhub = users.get("brandhub")!;
  const rakib = users.get("rakib")!;

  const deposit = await prisma.deposit.findFirst({ where: { buyerId: brandhub } });
  if (!deposit) {
    await prisma.deposit.create({
      data: {
        buyerId: brandhub,
        buyerName: "BrandHub BD",
        method: "bkash",
        senderNumber: "01712345678",
        trxId: "DEMO8H2K9L",
        amountBdt: 6000,
        usdRate: 120,
        amount: 50,
        status: "pending",
        createdAt: ago(1),
      },
    });
  }

  const withdrawal = await prisma.withdrawal.findFirst({ where: { workerId: rakib } });
  if (!withdrawal) {
    await prisma.withdrawal.create({
      data: {
        workerId: rakib,
        workerName: "Rakib Hasan",
        method: "bkash",
        accountNumber: "01812345678",
        amount: 3,
        fee: 0.15,
        net: 2.85,
        usdRate: 120,
        payoutBdt: 342,
        status: "pending",
        createdAt: ago(0.5),
      },
    });
  }

  const notified = await prisma.notification.findFirst({ where: { userId: rakib } });
  if (!notified) {
    await prisma.notification.createMany({
      data: [
        {
          userId: rakib,
          title: "Reward on hold",
          body: "Your YouTube subscribe was confirmed. The reward clears in 3 days.",
          kind: "success",
          href: "/worker/submissions",
          createdAt: ago(1),
        },
        {
          userId: rakib,
          title: "Withdrawal requested",
          body: "We received your $3.00 withdrawal request.",
          kind: "info",
          href: "/worker/wallet",
          createdAt: ago(0.5),
        },
      ],
    });
  }
}

/* ------------------------------------------------------------------ */

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data with NODE_ENV=production");
  }

  console.log("Seeding demo data…");
  const users = await seedPeople();
  console.log(`  people:      ${users.size}`);
  console.log(`  accounts:    ${await seedSocialAccounts(users)}`);
  const campaigns = await seedCampaigns(users);
  console.log(`  campaigns:   ${campaigns.size}`);
  console.log(`  submissions: ${await seedSubmissions(users, campaigns)}`);
  await seedMoney(users);

  console.log("\nSign in with any of these (password below):");
  for (const p of PEOPLE) console.log(`  ${p.role.padEnd(6)} ${email(p.key)}`);
  console.log(`\n  password: ${PASSWORD}`);
  console.log(
    "\nConnected accounts (/worker/accounts) shows a different state per worker:\n" +
      "  rakib   YouTube verified + token, Instagram self-declared\n" +
      "  nusrat  YouTube mid-verification (code showing), Facebook needs a profile link\n" +
      "  tanvir  YouTube proved by code — verified, but cannot take subscribe tasks\n" +
      "  shila   YouTube grant revoked",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
