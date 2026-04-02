"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app/app-shell";
import { RoleGuard } from "@/components/app/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ReviewsPage() {
  const audits = useQuery(api.audits.listReviewAudits);

  return (
    <AppShell title="Completions" subtitle="Engagements prepared for sign off action.">
      <RoleGuard allowed={["manager", "admin"]}>
        <div className="grid gap-3">
          {(audits ?? []).map((audit) => (
            <Card key={audit._id}>
              <CardHeader>
                <CardTitle className="text-base">{audit.templateTitle}</CardTitle>
                <CardDescription>
                  Auditor: {audit.auditorName} • Submitted {audit.submittedAt ? new Date(audit.submittedAt).toLocaleString() : "not submitted"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant="secondary" className="capitalize">
                  {audit.status.replace("_", " ")}
                </Badge>
                <Button asChild variant="outline">
                  <Link href={`/reviews/${audit._id}`}>Review</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {audits && audits.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No engagements in the review queue.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </RoleGuard>
    </AppShell>
  );
}

