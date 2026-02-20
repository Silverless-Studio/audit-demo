"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Role = "auditor" | "manager" | "admin";

export function RoleGuard({
  allowed,
  children,
}: {
  allowed: Role[];
  children: React.ReactNode;
}) {
  const user = useQuery(api.auth.getCurrentUser);

  if (user === undefined) {
    return <p className="text-sm text-muted-foreground">Checking access...</p>;
  }

  if (!user || !allowed.includes(user.role)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You do not have permission to access this page.
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

