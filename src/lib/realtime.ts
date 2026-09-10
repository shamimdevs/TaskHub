/**
 * Live server → browser messages, over Socket.IO.
 *
 * `server.ts` builds the io instance and parks it on `globalThis`; the domain
 * layer and route handlers reach it through here. Same Node process, so there
 * is no broker in the middle — and when there is no server at all (a script, a
 * seed, `next dev` on its own) every emit is a silent no-op rather than a
 * crash.
 *
 * Kept free of runtime imports on purpose: `socket.io` is a type-only import,
 * so the custom server and the Next bundle can both load this file.
 */
import type { Server } from "socket.io";
import type { Role } from "@/types";

/** What a browser receives on the `notification` channel. */
export interface RealtimePayload {
  id: string;
  title: string;
  body: string;
  kind: "info" | "success" | "warning" | "danger";
  href?: string | null;
  createdAt: string;
  /**
   * RTK Query tag types that just went stale, e.g. `["Wallet", "Deposit"]`.
   * The client refetches those instead of polling everything.
   */
  invalidate?: string[];
}

export const NOTIFICATION_EVENT = "notification";

/** One room per person, one per role — that is all the routing we need. */
export const userRoom = (userId: string) => `user:${userId}`;
export const roleRoom = (role: Role) => `role:${role}`;

const globalForIo = globalThis as typeof globalThis & { __taskhubIo?: Server };

export function setIo(io: Server) {
  globalForIo.__taskhubIo = io;
}

export function getIo(): Server | undefined {
  return globalForIo.__taskhubIo;
}

/** Deliver to every tab this person has open. No-op when nobody is connected. */
export function emitToUser(userId: string, payload: RealtimePayload) {
  getIo()?.to(userRoom(userId)).emit(NOTIFICATION_EVENT, payload);
}

/** Deliver to everyone holding a role — the admin review queues use this. */
export function emitToRole(role: Role, payload: RealtimePayload) {
  getIo()?.to(roleRoom(role)).emit(NOTIFICATION_EVENT, payload);
}
