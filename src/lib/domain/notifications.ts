import "server-only";
import type { NotificationKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitToRole, emitToUser, type RealtimePayload } from "@/lib/realtime";
import { sendPushToUser } from "@/lib/push";

/**
 * One place where a person gets told something happened. Every notification
 * goes out three ways from here:
 *
 *   1. a row in `Notification`   — the bell list, survives being offline
 *   2. a Socket.IO message       — the open tab updates without a refetch
 *   3. an FCM push               — the phone lights up with the app closed
 *
 * Callers are money paths (a deposit review, a reward release). None of them
 * should fail because a socket was down or Firebase was slow, so everything in
 * here is caught and logged rather than thrown.
 */

export interface NotifyInput {
  userId: string;
  title: string;
  body: string;
  kind?: NotificationKind;
  /** Where the notification takes you when tapped. */
  href?: string;
  /**
   * RTK Query tag types this event invalidated, e.g. `["Wallet", "Deposit"]`.
   * The open tab refetches exactly those.
   */
  invalidate?: string[];
  /** `false` for chatty events that do not deserve a buzz on the phone. */
  push?: boolean;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    const row = await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        kind: input.kind ?? "info",
        href: input.href ?? null,
      },
    });

    emitToUser(input.userId, toPayload(row, input.invalidate));

    if (input.push !== false) {
      await sendPushToUser(input.userId, {
        title: input.title,
        body: input.body,
        href: input.href,
      });
    }
  } catch (err) {
    // The event already happened — losing its notification must not undo it.
    console.error("[notify] could not deliver:", (err as Error).message);
  }
}

/**
 * Everyone who works the review queues. Their panels are live, so the socket
 * message is the point here; the push is optional and off by default so an
 * admin's phone does not buzz on every single deposit.
 */
export async function notifyAdmins(
  input: Omit<NotifyInput, "userId">,
): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin", status: "active" },
      select: { id: true },
    });
    await Promise.all(
      admins.map((a) => notify({ push: false, ...input, userId: a.id })),
    );
  } catch (err) {
    console.error("[notify] admin fan-out failed:", (err as Error).message);
  }
}

/** Broadcast to a role without writing a row — used for queue counters. */
export function pingRole(role: "admin", payload: RealtimePayload) {
  emitToRole(role, payload);
}

function toPayload(
  row: {
    id: string;
    title: string;
    body: string;
    kind: NotificationKind;
    href: string | null;
    createdAt: Date;
  },
  invalidate?: string[],
): RealtimePayload {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    kind: row.kind,
    href: row.href,
    createdAt: row.createdAt.toISOString(),
    invalidate,
  };
}
