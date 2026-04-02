"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app/app-shell";
import { RoleGuard } from "@/components/app/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AuditsPage() {
  const audits = useQuery(api.audits.listMyAudits);

  return (
    <AppShell title="Engagements" subtitle="All of your engagement drafts and submissions.">
      <RoleGuard allowed={["auditor", "admin"]}>
        <div className="mb-4">
          <Button asChild>
            <Link href="/audits/new">Start new engagement</Link>
          </Button>
        </div>
        <div className="grid gap-3">
          {(audits ?? []).map((audit) => (
            <Card key={audit._id}>
              <CardHeader>
                <CardTitle className="text-base">{audit.templateTitle}</CardTitle>
                <CardDescription>
                  Started {new Date(audit.startedAt).toLocaleString()} • Version {audit.templateVersion}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant="secondary" className="capitalize">
                  {audit.status.replace("_", " ")}
                </Badge>
                <Button asChild variant="outline">
                  <Link href={`/audits/${audit._id}`}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {audits && audits.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No engagements yet.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </RoleGuard>
    </AppShell>
  );
}

