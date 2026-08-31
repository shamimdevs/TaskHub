"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Misc";
import { UserStatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import {
  DataField,
  DataList,
  DataRow,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import {
  useGetUsersQuery,
  useUpdateUserMutation,
} from "@/redux/features/users/usersApi";
import { formatMoney, formatDate } from "@/lib/utils";
import type { Role } from "@/types";

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const query = useGetUsersQuery({ q, role });
  const [update, { isLoading }] = useUpdateUserMutation();
  const toast = useToast();

  const toggleBan = async (id: string, banned: boolean) => {
    try {
      await update({ id, action: banned ? "unban" : "ban", reason: "Policy violation" }).unwrap();
      toast.success(banned ? "User unbanned" : "User banned");
    } catch {
      toast.error("Action failed");
    }
  };

  return (
    <>
      <PageHeader title="Users" description="Search, review and moderate accounts" />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          icon={Search}
          placeholder="Search name, email or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as Role | "all")}
          className="sm:max-w-[10rem]"
        >
          <option value="all">All roles</option>
          <option value="worker">Workers</option>
          <option value="buyer">Buyers</option>
          <option value="admin">Admins</option>
        </Select>
      </div>

      <QueryBoundary query={query} empty={{ title: "No users found" }}>
        {(users) => (
          <>
            {/* Desktop */}
            <Card className="hidden overflow-hidden lg:block">
              <Table>
                <THead>
                  <tr>
                    <TH>User</TH>
                    <TH>Role</TH>
                    <TH>Balance</TH>
                    <TH>Status</TH>
                    <TH>Joined</TH>
                    <TH className="text-right">Action</TH>
                  </tr>
                </THead>
                <TBody>
                  {users.map((u) => (
                    <TR key={u.id}>
                      <TD>
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="flex items-center gap-2.5 font-medium hover:text-brand"
                        >
                          <Avatar name={u.name} size={30} />
                          <span>
                            {u.name}
                            <span className="block text-xs font-normal text-fg-subtle">
                              {u.email}
                            </span>
                          </span>
                        </Link>
                      </TD>
                      <TD>
                        <Badge tone="neutral" className="capitalize">
                          {u.role}
                        </Badge>
                      </TD>
                      <TD className="tabular-nums">{formatMoney(u.balance)}</TD>
                      <TD>
                        <UserStatusBadge status={u.status} />
                      </TD>
                      <TD className="text-fg-muted">{formatDate(u.createdAt)}</TD>
                      <TD className="text-right">
                        {u.role !== "admin" && (
                          <Button
                            size="sm"
                            variant={u.status === "banned" ? "outline" : "ghost"}
                            className={
                              u.status === "banned"
                                ? ""
                                : "text-danger hover:bg-danger-soft"
                            }
                            loading={isLoading}
                            onClick={() => toggleBan(u.id, u.status === "banned")}
                          >
                            {u.status === "banned" ? "Unban" : "Ban"}
                          </Button>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Card>

            {/* Mobile */}
            <DataList className="lg:hidden">
              {users.map((u) => (
                <DataRow key={u.id}>
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="flex items-center gap-2.5"
                  >
                    <Avatar name={u.name} size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-fg">
                        {u.name}
                      </p>
                      <p className="truncate text-xs text-fg-muted">{u.email}</p>
                    </div>
                  </Link>
                  <div className="mt-2 border-t border-border pt-1">
                    <DataField label="Role">
                      <span className="capitalize">{u.role}</span>
                    </DataField>
                    <DataField label="Balance">{formatMoney(u.balance)}</DataField>
                    <DataField label="Status">
                      <UserStatusBadge status={u.status} />
                    </DataField>
                  </div>
                  {u.role !== "admin" && (
                    <Button
                      size="sm"
                      fullWidth
                      variant={u.status === "banned" ? "outline" : "ghost"}
                      className={
                        u.status === "banned"
                          ? "mt-2"
                          : "mt-2 text-danger hover:bg-danger-soft"
                      }
                      loading={isLoading}
                      onClick={() => toggleBan(u.id, u.status === "banned")}
                    >
                      {u.status === "banned" ? "Unban user" : "Ban user"}
                    </Button>
                  )}
                </DataRow>
              ))}
            </DataList>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
