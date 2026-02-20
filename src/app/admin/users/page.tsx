"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { AppShell } from "@/components/app/app-shell";
import { RoleGuard } from "@/components/app/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const roles = ["auditor", "manager", "admin"] as const;

export default function AdminUsersPage() {
  const users = useQuery(api.users.listUsers);
  const changeUserRole = useMutation(api.users.changeUserRole);

  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const updateRole = async (
    userId: Id<"users">,
    role: "auditor" | "manager" | "admin",
  ) => {
    setSavingUserId(userId);
    try {
      await changeUserRole({
        userId,
        role,
      });
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <AppShell title="Users" subtitle="Manage platform roles.">
      <RoleGuard allowed={["admin"]}>
        <div className="grid gap-3">
          {(users ?? []).map((user) => (
            <Card key={user._id}>
              <CardHeader>
                <CardTitle className="text-base">{user.name}</CardTitle>
                <CardDescription>
                  {user.email} • Joined {new Date(user.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge className="capitalize" variant="secondary">
                  {user.role}
                </Badge>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Button
                      key={role}
                      variant={user.role === role ? "default" : "outline"}
                      disabled={savingUserId === user._id}
                      onClick={() => updateRole(user._id, role)}
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {users && users.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No users found.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </RoleGuard>
    </AppShell>
  );
}

