"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Bell, CheckCheck, Info, TriangleAlert, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Button } from "@/components/ui/Button";
import {
  useGetNotificationsQuery,
  useMarkNotificationsReadMutation,
} from "@/redux/features/notifications/notificationsApi";
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
        <Bell size={12} /> Push notifications arrive here and on your device (PWA).
      </p>
    </>
  );
}
