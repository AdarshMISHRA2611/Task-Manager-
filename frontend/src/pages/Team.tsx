import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Search, ShieldCheck, Users } from "lucide-react";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import type { User, UserRole } from "@/services/types";
import { useAuth } from "@/services/authContext";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { useConfirm } from "@/components/ui/ConfirmDialog";

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

type RoleFilter = "all" | UserRole;

export default function TeamPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: qk.users,
    queryFn: async () => (await api.get<User[]>("/api/users")).data,
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: UserRole }) =>
      api.patch(`/api/users/${userId}/role`, { role }),
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: qk.users });
      queryClient.invalidateQueries({ queryKey: qk.me });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const users = usersQuery.data ?? [];
  const adminCount = useMemo(
    () => users.filter((u) => u.role === "Admin").length,
    [users],
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, search, roleFilter]);

  const onChangeRole = async (target: User, role: UserRole) => {
    if (role === target.role) return;
    if (user && target.id === user.id) {
      toast.error("You cannot change your own role.");
      return;
    }
    if (target.role === "Admin" && role === "Member" && adminCount <= 1) {
      toast.error("At least one admin is required.");
      return;
    }
    const verb = role === "Admin" ? "Promote" : "Demote";
    const ok = await confirm({
      title: `${verb} ${target.name}?`,
      description:
        role === "Admin"
          ? "They will gain full workspace permissions."
          : "They will lose admin permissions across the workspace.",
      confirmLabel: verb,
      tone: role === "Member" ? "danger" : "primary",
    });
    if (!ok) return;
    roleMutation.mutate({ userId: target.id, role });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {adminCount} {adminCount === 1 ? "admin" : "admins"} • {users.length} total
          </p>
        </div>
      </header>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Search
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="w-full rounded-lg border border-border-strong bg-surface pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-subtle hover:border-border-strong focus-ring"
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Role
            </label>
            <Select<RoleFilter>
              value={roleFilter}
              onChange={(v) => setRoleFilter(v)}
              options={[
                { value: "all", label: "All roles" },
                { value: "Admin", label: "Admins" },
                { value: "Member", label: "Members" },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card padding={false}>
        {usersQuery.isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Users}
              title="No matches"
              description="Try adjusting your search or role filter."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredUsers.map((u) => {
              const isSelf = u.id === user?.id;
              const isLastAdmin = u.role === "Admin" && adminCount <= 1;
              return (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-subtle text-sm font-semibold text-brand-subtle-foreground ring-1 ring-brand-subtle-border">
                      {initials(u.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {u.name}
                        {isSelf && (
                          <span className="ml-2 rounded-md bg-brand-subtle px-1.5 py-0.5 text-xs font-medium text-brand-subtle-foreground ring-1 ring-brand-subtle-border">
                            You
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.role === "Admin" && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand-subtle px-2 py-1 text-xs font-medium text-brand-subtle-foreground ring-1 ring-brand-subtle-border">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Admin
                      </span>
                    )}
                    <Select<UserRole>
                      value={u.role}
                      onChange={(v) => onChangeRole(u, v)}
                      options={[
                        { value: "Admin", label: "Admin" },
                        {
                          value: "Member",
                          label: "Member",
                          disabled: isLastAdmin,
                          description: isLastAdmin
                            ? "At least one admin is required"
                            : undefined,
                        },
                      ]}
                      size="sm"
                      disabled={isSelf || roleMutation.isPending}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
