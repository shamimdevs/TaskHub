"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Flame,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/Stat";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { LinkButton } from "@/components/ui/Button";
import { TaskCard } from "@/components/panels/worker/TaskCard";
import { MiniBarChart } from "@/components/panels/worker/MiniBarChart";
import { useGetWalletQuery } from "@/redux/features/wallet/walletApi";
import { useGetTasksQuery } from "@/redux/features/tasks/tasksApi";
import { useGetSubmissionsQuery } from "@/redux/features/submissions/submissionsApi";
import { formatMoney } from "@/lib/utils";

export default function WorkerDashboard() {
  const wallet = useGetWalletQuery();
  const tasks = useGetTasksQuery();
  const subs = useGetSubmissionsQuery();

  const completed = subs.data?.filter((s) => s.status === "approved") ?? [];
  const onHold = completed.filter((s) => !s.releasedAt).length;
  const balance = wallet.data?.user.balance ?? 0;
  const held = wallet.data?.user.heldBalance ?? 0;
  const earnedToday = 6.15;

  const week = [
    { label: "M", value: 12 },
    { label: "T", value: 18 },
    { label: "W", value: 9 },
    { label: "T", value: 22 },
    { label: "F", value: 15 },
    { label: "S", value: 27 },
    { label: "S", value: 6 },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your earnings at a glance"
        action={
          <LinkButton href="/worker/tasks" size="sm" iconRight={ArrowRight}>
            Start earning
          </LinkButton>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Balance"
          value={formatMoney(balance)}
          icon={Wallet}
          hint={`${formatMoney(Math.max(0, balance - held))} ready to withdraw`}
        />
        <StatCard
          label="On hold"
          value={formatMoney(held)}
          icon={CalendarClock}
          tone="warning"
          hint={`${onHold} ${onHold === 1 ? "reward" : "rewards"} clearing`}
        />
        <StatCard
          label="Earned today"
          value={formatMoney(earnedToday)}
          icon={Flame}
          tone="accent"
          hint="Keep the streak going"
        />
        <StatCard
          label="Tasks completed"
          value={completed.length}
          icon={BadgeCheck}
          tone="brand"
          hint="All time"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="This week" description="Tasks completed per day" />
          <CardBody>
            <MiniBarChart data={week} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Recommended for you"
            description="Fresh tasks matched to your account"
            action={
              <Link
                href="/worker/tasks"
                className="text-xs font-semibold text-brand hover:underline"
              >
                See all
              </Link>
            }
          />
          <CardBody>
            <QueryBoundary
              query={tasks}
              empty={{ title: "No tasks right now", description: "Check back soon." }}
            >
              {(list) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  {list.slice(0, 4).map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                </div>
              )}
            </QueryBoundary>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
