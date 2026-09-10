"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, BellRing, CheckCheck, Info, TriangleAlert, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  useGetNotificationsQuery,
  useMarkNotificationsReadMutation,
} from "@/redux/features/notifications/notificationsApi";
import { enablePush, pushConfigured } from "@/lib/firebase-client";
import { relativeTime, cn } from "@/lib/utils";

const ICON = {
  info: Info,
  success: CheckCheck,
  warning: TriangleAlert,
  danger: XCircle,
} as const;

const TONE = {
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
} as const;

export function NotificationsPanel() {
  const query = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationsReadMutation();
  const toast = useToast();
  const [pushBusy, setPushBusy] = useState(false);

  /**
   * Asking is the only way to know where this browser stands — reading
   * Notification.permission during render would differ between the server and
   * the client. Re-registering an already-allowed device is a no-op.
   */
  const turnOnPush = async () => {
    setPushBusy(true);
    try {
      const result = await enablePush();
      if (result === "enabled") {
        toast.success("Push is on", "This device will get alerts with the app closed.");
      } else if (result === "denied") {
        toast.error("Blocked", "Allow notifications for this site in your browser settings.");
      } else {
        toast.info("Not available", "This browser cannot receive push notifications.");
      }
    } catch {
      toast.error("Could not turn on push");
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    // mark read shortly after viewing
    const timer = setTimeout(() => {
      if (query.data?.some((n) => !n.read)) markRead();
    }, 1500);
    return () => clearTimeout(timer);
  }, [query.data, markRead]);

  return (
    <>
      <PageHeader
        title="Notifications"
        action={
          <Button size="sm" variant="outline" icon={CheckCheck} onClick={() => markRead()}>
            Mark all read
          </Button>
        }
      />

      {pushConfigured && (
        <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-fg">Push notifications</p>
            <p className="text-xs text-fg-muted">
              Get approvals, rewards and payouts on this device even when TaskHub
              is closed.
            </p>
          </div>
          <Button
            size="sm"
            icon={BellRing}
            loading={pushBusy}
            onClick={turnOnPush}
            className="shrink-0"
          >
            Turn on
          </Button>
        </Card>
      )}

      <QueryBoundary
        query={query}
        empty={{ title: "You're all caught up", description: "No notifications yet." }}
      >
        {(list) => (
          <Card>
            <ul className="divide-y divide-border">
              {list.map((n) => {
                const Icon = ICON[n.kind];
                const body = (
                  <div
                    className={cn(
                      "flex gap-3 p-4 transition-colors",
                      !n.read && "bg-brand-50/50 dark:bg-brand-950/30",
                    )}
                  >
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", TONE[n.kind])}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-fg">
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-fg-muted">{n.body}</p>
                      <p className="mt-1 text-[11px] text-fg-subtle">
                        {relativeTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.href ? <Link href={n.href}>{body}</Link> : body}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </QueryBoundary>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-subtle">
        <Bell size={12} /> Alerts land here live, and on your device once push is on.
      </p>
    </>
  );
}
