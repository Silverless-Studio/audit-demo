"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app/app-shell";
import { RoleGuard } from "@/components/app/role-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminHomePage() {
  const summary = useQuery(api.audits.getDashboardSummary);

  return (
    <AppShell title="Admin" subtitle="Platform administration and governance.">
      <RoleGuard allowed={["admin"]}>
        <div className="grid gap-4 md:grid-cols-2">
          {summary
            ? Object.entries(summary).map(([key, value]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-sm capitalize">{key}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{String(value)}</CardContent>
                </Card>
              ))
            : null}
        </div>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Admin actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/admin/templates">Manage templates</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/users">Manage users</Link>
            </Button>
          </CardContent>
        </Card>
      </RoleGuard>
    </AppShell>
  );
}

