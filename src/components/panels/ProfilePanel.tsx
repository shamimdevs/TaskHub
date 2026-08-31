"use client";

import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Camera,
  LogOut,
  Mail,
  Phone,
  ShieldAlert,
  Users,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Misc";
import { Avatar } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useGetWalletQuery } from "@/redux/features/wallet/walletApi";
import { useGetMeQuery } from "@/redux/features/session/sessionApi";
import type { Role } from "@/types";
import { formatDate } from "@/lib/utils";

const SOCIALS = [
  { icon: Users, label: "Facebook", handle: "@rakib.hasan", connected: true },
  { icon: Camera, label: "Instagram", handle: "@rakib_h", connected: true },
  { icon: Video, label: "YouTube", handle: "Not linked", connected: false },
];

export function ProfilePanel({ role }: { role: Role }) {
  const { data: wallet } = useGetWalletQuery();
  const { data: me } = useGetMeQuery();
  const toast = useToast();
  const router = useRouter();

  const name = wallet?.user.name ?? "TaskHub user";
  const banned = me?.status === "banned";

  return (
    <>
      <PageHeader title="Profile" description="Manage your account" />

      {banned && (
        <Alert tone="danger" title="Account banned" className="mb-4">
          <span className="flex gap-2">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            {me?.banReason ?? "Contact support for details."}
          </span>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Card>
            <CardBody className="flex items-center gap-4">
              <Avatar name={name} size={64} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-fg">{name}</p>
                  <BadgeCheck size={16} className="text-brand" />
                </div>
                <p className="text-sm text-fg-muted">{me?.email}</p>
                <p className="mt-1 text-[11px] text-fg-subtle">
                  Member since {me ? formatDate(me.createdAt) : "—"}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Account details" />
            <CardBody className="space-y-3">
              <Field label="Full name">
                <Input defaultValue={name} />
              </Field>
              <Field label="Email">
                <Input icon={Mail} defaultValue={me?.email} type="email" />
              </Field>
              <Field label="Phone">
                <Input icon={Phone} defaultValue={me?.phone} inputMode="numeric" />
              </Field>
              <Button onClick={() => toast.success("Profile saved")}>
                Save changes
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Change password" />
            <CardBody className="space-y-3">
              <Field label="Current password">
                <Input type="password" placeholder="••••••••" />
              </Field>
              <Field label="New password">
                <Input type="password" placeholder="••••••••" />
              </Field>
              <Button
                variant="outline"
                onClick={() => toast.success("Password updated")}
              >
                Update password
              </Button>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          {role === "worker" && (
            <Card>
              <CardHeader
                title="Connected accounts"
                description="Used to verify your task proofs"
              />
              <CardBody className="space-y-2">
                {SOCIALS.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-3 rounded-lg border border-border p-2.5"
                  >
                    <s.icon size={18} className="text-fg-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg">{s.label}</p>
                      <p className="truncate text-xs text-fg-muted">{s.handle}</p>
                    </div>
                    {s.connected ? (
                      <Badge tone="success">Linked</Badge>
                    ) : (
                      <Button size="sm" variant="outline">
                        Link
                      </Button>
                    )}
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody>
              <Button
                variant="ghost"
                fullWidth
                icon={LogOut}
                className="text-danger hover:bg-danger-soft"
                onClick={() => {
                  toast.info("Signed out (demo)");
                  router.push("/login");
                }}
              >
                Sign out
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
