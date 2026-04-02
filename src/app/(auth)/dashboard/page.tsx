"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const summary = useQuery(api.audits.getDashboardSummary);
  const user = useQuery(api.auth.getCurrentUser);

  const quickLinks: Array<{
    href: string;
    label: string;
    roles: Array<"auditor" | "manager" | "admin">;
  }> = [
    { href: "/audits", label: "Engagements", roles: ["auditor", "admin"] },
    { href: "/reviews", label: "Completion", roles: ["manager", "admin"] },
    { href: "/admin", label: "Admin", roles: ["admin"] },
  ];

  return (
    <AppShell title="Dashboard" subtitle="Audit platform overview">
      <div className="grid gap-4 md:grid-cols-2">
        {summary ? (
          Object.entries(summary).map(([key, value]) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-sm capitalize">{key}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{String(value)}</CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Loading</CardTitle>
              <CardDescription>Collecting dashboard metrics.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {quickLinks
            .filter((link) => !user || link.roles.includes(user.role))
            .map((link) => (
              <Button asChild key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}

