"use client";

import { use, useState } from "react";
import { ShieldAlert, ShieldCheck, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Avatar, Alert } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { UserStatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  useGetUserQuery,
  useUpdateUserMutation,
} from "@/redux/features/users/usersApi";
import { formatMoney, formatDate, relativeTime } from "@/lib/utils";

export default function AdminUserDetail({
  params,
}: PageProps<"/admin/users/[id]">) {
  const { id } = use(params);
  const query = useGetUserQuery(id);
  const [update, { isLoading }] = useUpdateUserMutation();
  const toast = useToast();
  const [adjust, setAdjust] = useState("");

  const act = async (
    action: "ban" | "unban" | "adjust",
    extra?: { reason?: string; amount?: number },
  ) => {
    try {
      await update({ id, action, ...extra }).unwrap();
      toast.success("Updated");
      setAdjust("");
    } catch {
      toast.error("Action failed");
    }
  };

  return (
    <>
      <PageHeader title="User" back={{ href: "/admin/users", label: "Users" }} />

      <QueryBoundary query={query} isEmpty={() => false}>
        {(u) => (
          <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-4">
              <Card>
                <CardBody className="flex items-center gap-4">
                  <Avatar name={u.name} size={60} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-fg">{u.name}</p>
                      <Badge tone="neutral" className="capitalize">
                        {u.role}
                      </Badge>
                      <UserStatusBadge status={u.status} />
                    </div>
                    <p className="text-sm text-fg-muted">{u.email}</p>
                    <p className="text-xs text-fg-subtle">
                      {u.phone} · joined {formatDate(u.createdAt)} · active{" "}
                      {relativeTime(u.lastActiveAt)}
                    </p>
                  </div>
                </CardBody>
              </Card>

              {u.status === "banned" && (
                <Alert tone="danger" title="Banned">
                  {u.banReason}
                </Alert>
              )}

              <Card>
                <CardHeader title="Wallet" />
                <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Balance" value={formatMoney(u.balance)} />
                  <Stat label="Pending" value={formatMoney(u.pendingBalance)} />
                  <Stat label="Earned" value={formatMoney(u.lifetimeEarned ?? 0)} />
                  <Stat label="Spent" value={formatMoney(u.lifetimeSpent ?? 0)} />
                </CardBody>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader title="Moderation" />
                <CardBody className="space-y-3">
                  {u.status === "banned" ? (
                    <Button
                      fullWidth
                      icon={ShieldCheck}
                      loading={isLoading}
                      onClick={() => act("unban")}
                    >
                      Unban user
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="danger"
                      icon={ShieldAlert}
                      loading={isLoading}
                      onClick={() =>
                        act("ban", { reason: "Unfollowed after reward paid" })
                      }
                    >
                      Ban user
                    </Button>
                  )}

                  <Field label="Adjust balance" hint="Use a negative value to deduct">
                    <Input
                      type="number"
                      placeholder="e.g. -15"
                      suffix="৳"
                      value={adjust}
                      onChange={(e) => setAdjust(e.target.value)}
                    />
                  </Field>
                  <Button
                    fullWidth
                    variant="outline"
                    icon={Wallet}
                    loading={isLoading}
                    disabled={!adjust}
                    onClick={() => act("adjust", { amount: Number(adjust) })}
                  >
                    Apply adjustment
                  </Button>
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
