"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from "firebase/messaging";

/**
 * Browser half of Firebase Cloud Messaging.
 *
 * Everything here is optional: without the NEXT_PUBLIC_FIREBASE_* values the
 * app runs exactly as before, minus the "turn on push" button. Sending is in
 * src/lib/push.ts, and the background handler in
 * public/firebase-messaging-sw.js.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

/** True when this build carries a complete web-push configuration. */
export const pushConfigured = Boolean(
  config.apiKey && config.projectId && config.messagingSenderId && config.appId && vapidKey,
);

export type PushResult = "enabled" | "denied" | "unsupported";

function firebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(config);
}

async function messaging(): Promise<Messaging | null> {
  if (!pushConfigured || typeof window === "undefined") return null;
  if (!(await isSupported())) return null;
  return getMessaging(firebaseApp());
}

/**
 * The service worker cannot read NEXT_PUBLIC_* at runtime — it is a static file
 * served outside the bundle — so the config rides along on its URL and the
 * worker reads it back from `location.search`.
 */
function serviceWorkerUrl() {
  const params = new URLSearchParams({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });
  return `/firebase-messaging-sw.js?${params.toString()}`;
}

/** The token this browser last registered, so it can be revoked on sign-out. */
const TOKEN_KEY = "taskhub.push.token";

export function currentPushToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Asks for permission, registers the worker, and hands the token to the server.
 * Safe to call again — FCM returns the same token and the upsert is idempotent.
 */
export async function enablePush(): Promise<PushResult> {
  const m = await messaging();
  if (!m || !("serviceWorker" in navigator)) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const registration = await navigator.serviceWorker.register(serviceWorkerUrl(), {
    scope: "/",
  });
  const token = await getToken(m, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return "unsupported";

  const res = await fetch("/api/push/tokens", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) return "unsupported";

  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Private mode: push still works, we just cannot revoke it on sign-out.
  }
  return "enabled";
}

/** Stop push on this device — used when signing out. */
export async function disablePush(): Promise<void> {
  const token = currentPushToken();
  if (token) {
    await fetch("/api/push/tokens", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => {});
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
  const m = await messaging();
  if (m) await deleteToken(m).catch(() => {});
}

/**
 * Messages that arrive while the tab is focused. FCM does not raise a system
 * notification for those — the app shows its own toast instead.
 */
export async function onForegroundPush(
  handler: (payload: MessagePayload) => void,
): Promise<() => void> {
  const m = await messaging();
  if (!m) return () => {};
  return onMessage(m, handler);
}
