"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useAppDispatch } from "@/redux/hooks";
import { baseApi, TAG_TYPES, type ApiTag } from "@/redux/base/api";
import { useToast } from "@/components/ui/Toast";
import { onForegroundPush } from "@/lib/firebase-client";

/**
 * Keeps a signed-in panel live.
 *
 * Renders nothing: it holds the Socket.IO connection, turns each server event
 * into a toast, and refetches only the caches the server says went stale.
 *
 * Mounted by AppShell, so it only ever runs behind authentication.
 */

interface RealtimePayload {
  id: string;
  title: string;
  body: string;
  kind: "info" | "success" | "warning" | "danger";
  href?: string | null;
  createdAt: string;
  invalidate?: string[];
}

const TOAST_KIND = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "error",
} as const;

const KNOWN_TAGS = new Set<string>(TAG_TYPES);

export function RealtimeBridge() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Same origin as the page; the session cookie rides along on the handshake.
    const socket = io({ withCredentials: true });
    socketRef.current = socket;

    socket.on("notification", (payload: RealtimePayload) => {
      toast.toast({
        kind: TOAST_KIND[payload.kind] ?? "info",
        title: payload.title,
        description: payload.body,
      });

      // The bell always changes; the rest is whatever the server flagged.
      const stale = (payload.invalidate ?? []).filter(
        (t): t is ApiTag => KNOWN_TAGS.has(t),
      );
      dispatch(
        baseApi.util.invalidateTags([
          { type: "Notification", id: "LIST" },
          ...stale.map((type) => ({ type })),
        ]),
      );
    });

    socket.on("connect_error", (err) => {
      // A signed-out or expired session will never succeed by retrying.
      if (err.message === "unauthorised") socket.close();
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [dispatch, toast]);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;

    // FCM hands a focused tab the message instead of raising a system
    // notification. The socket normally covers that case — this is the
    // fallback for a tab whose connection dropped.
    onForegroundPush((payload) => {
      if (socketRef.current?.connected) return;
      const n = payload.notification;
      if (n?.title) toast.info(n.title, n.body ?? undefined);
      dispatch(baseApi.util.invalidateTags([{ type: "Notification", id: "LIST" }]));
    }).then((unsubscribe) => {
      if (cancelled) unsubscribe();
      else stop = unsubscribe;
    });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [dispatch, toast]);

  return null;
}
