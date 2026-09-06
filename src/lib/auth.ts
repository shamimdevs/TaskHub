import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { sendEmail, otpEmail, EmailDeliveryError } from "@/lib/email";
import { generateReferralCode } from "@/lib/referral";
import { APP_NAME } from "@/lib/constants";

/**
 * Every auth code is this exact value while it is set — no mail needs to go
 * out to complete a sign-up or a reset. Set AUTH_STATIC_OTP="" in the
 * environment to go back to random one-time codes.
 */
const STATIC_OTP = process.env.AUTH_STATIC_OTP ?? "123456";

if (STATIC_OTP) {
  console.warn(
    `[auth] Static OTP is on — every verification code is "${STATIC_OTP}". ` +
      `Set AUTH_STATIC_OTP="" before going live.`,
  );
}

const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

/**
 * Send an auth email but never let an SMTP outage break sign-up / reset —
 * `sendEmail` logs the message, code included, before this resolves.
 */
async function deliver(to: string, template: { subject: string; html: string; text: string }) {
  try {
    await sendEmail({ to, ...template });
  } catch (err) {
    if (err instanceof EmailDeliveryError) return;
    throw err;
  }
}

export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  // Prisma owns id generation (`@default(cuid())`).
  advanced: { database: { generateId: false } },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Resets run on codes, not links — see the emailOTP plugin below.
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    // The OTP plugin replaces the link sender (overrideDefaultEmailVerification).
  },

  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
      }
    : {},

  user: {
    additionalFields: {
      // No defaultValue: the create hook needs to tell "sent worker" apart
      // from "never chose" (Google), which is what roleChosen records.
      role: {
        type: "string",
        required: false,
        input: true,
      },
      phone: { type: "string", required: false, input: true },
      referredByCode: { type: "string", required: false, input: true },
      roleChosen: { type: "boolean", required: false, input: false },
      // Set by the create.before hook — must be declared or the adapter
      // strips it and Prisma rejects the insert (referralCode is required).
      referralCode: { type: "string", required: false, input: false },
      referredById: { type: "string", required: false, input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    // Lets proxy.ts read role from a signed cookie without a DB round-trip.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const requested = (user as { role?: string }).role;
          // Self-signup can only ever create a worker or a buyer. A social
          // sign-up sends no role at all: park them on worker and mark the
          // choice as still owed, so /setup-role asks on first login.
          const chosen = requested === "worker" || requested === "buyer";
          return {
            data: {
              ...user,
              role: chosen ? requested : "worker",
              roleChosen: chosen,
              referralCode: await generateReferralCode(user.name),
            },
          };
        },
        after: async (user) => {
          const code = (user as { referredByCode?: string | null }).referredByCode;
          if (!code) return;
          const referrer = await prisma.user.findUnique({
            where: { referralCode: code.toUpperCase().trim() },
            select: { id: true },
          });
          if (!referrer || referrer.id === user.id) return;
          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: { referredById: referrer.id },
            }),
            prisma.referral.create({
              data: {
                referrerId: referrer.id,
                referredUserId: user.id,
                name: user.name,
                status: "joined",
              },
            }),
          ]);
        },
      },
      update: {
        before: async (data) => {
          // `updateUser` is self-service, so role must never travel through it:
          // it is set once at sign-up, or by POST /api/session/role, which
          // writes with Prisma directly and so never reaches this hook.
          // Returning `false` aborts — dropping the key would not, because
          // Better Auth merges this result over the original payload.
          const patch = data as Record<string, unknown>;
          if ("role" in patch || "roleChosen" in patch) return false;
          return { data: patch };
        },
      },
    },
  },

  plugins: [
    emailOTP({
      // Sign-up verification and password resets both run on this code.
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: 60 * 15,
      allowedAttempts: 5,
      // Returning undefined hands back to Better Auth's random generator.
      generateOTP: () => STATIC_OTP || undefined,
      sendVerificationOTP: async ({ email, otp, type }) => {
        await deliver(email, otpEmail(otp, type));
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
