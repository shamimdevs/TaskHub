import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "@/lib/prisma";
import { APP_NAME } from "@/lib/constants";

/**
 * Device push, over Firebase Cloud Messaging.
 *
 * Off unless all three FIREBASE_* service-account values are set — a half
 * configured project is worse than none, so it says so once and stays quiet
 * after that. Nothing here ever throws at the caller: a deposit is approved
 * whether or not the phone hears about it.
 */

const PUSH_ICON = "/icon.svg";

/** `undefined` = not looked at yet, `null` = deliberately off. */
let cached: App | null | undefined;

function pushApp(): App | null {
  if (cached !== undefined) return cached;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // A private key survives .env as one line with literal \n in it.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "[push] FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY " +
        "not all set — device push is off, in-app notifications still work.",
    );
    cached = null;
    return cached;
  }

  try {
    cached =
      getApps()[0] ??
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } catch (err) {
    console.error("[push] Firebase Admin failed to start:", (err as Error).message);
    cached = null;
  }
  return cached;
}

/** True once the browser can be offered a "turn on push" button. */
export function pushEnabled() {
  return pushApp() !== null;
}

/** FCM's way of saying "this token is gone, stop sending to it". */
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

export interface PushMessage {
  title: string;
  body: string;
  /** Where tapping the notification lands, e.g. `/worker/wallet`. */
  href?: string | null;
}

/**
 * Sends to every device this person registered, and forgets the ones FCM
 * rejects — tokens rotate, and a stale one would otherwise be retried forever.
 */
export async function sendPushToUser(userId: string, msg: PushMessage) {
  const app = pushApp();
  if (!app) return;

  const rows = await prisma.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });
  if (rows.length === 0) return;

  const link = msg.href || "/";
  const tokens = rows.map((r) => r.token);

  try {
    const res = await getMessaging(app).sendEachForMulticast({
      tokens,
      notification: { title: msg.title, body: msg.body },
      data: { href: link },
      webpush: {
        notification: { title: msg.title, body: msg.body, icon: PUSH_ICON, tag: APP_NAME },
        fcmOptions: { link },
      },
    });

    const dead = res.responses
      .map((r, i) =>
        !r.success && DEAD_TOKEN_CODES.has(r.error?.code ?? "") ? tokens[i] : null,
      )
      .filter((t): t is string => t !== null);

    if (dead.length) {
      await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
    }
  } catch (err) {
    console.error("[push] send failed:", (err as Error).message);
  }
}
