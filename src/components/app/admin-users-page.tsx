"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { api } from "@/lib/convex-api";
import { ROLE_LABELS } from "@/lib/domain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_ITEMS = [
  { label: "Auditor", value: "auditor" },
  { label: "Manager", value: "manager" },
  { label: "Admin", value: "admin" },
] as const;

export function AdminUsersPage() {
  const users = useQuery(api.users.listUsers, {});
  const setUserRole = useMutation(api.users.setUserRole);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onRoleChange = async (userId: string, role: "auditor" | "manager" | "admin") => {
    setError(null);
    setUpdatingUserId(userId);
    try {
      await setUserRole({ userId: userId as Id<"users">, role });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (users === undefined) {
    return <p className="text-xs text-muted-foreground">Loading users...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Users & Roles</h1>
        <p className="text-muted-foreground text-xs">
          Change role assignments for auditors, managers, and admins.
        </p>
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user._id}>
            <CardHeader>
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Current role: {ROLE_LABELS[user.role]}
              </p>
              <Select
                items={ROLE_ITEMS}
                value={user.role}
                onValueChange={(value) =>
                  onRoleChange(user._id, value as "auditor" | "manager" | "admin")
                }
                disabled={updatingUserId === user._id}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {ROLE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
