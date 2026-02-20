import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/lib/convex-api";
import { requireSessionUser } from "@/lib/server-auth";
import { AuditStatusBadge } from "@/components/app/status-badges";

export default async function AuditsPage() {
  await requireSessionUser(["auditor", "admin"]);
  const audits = await fetchAuthQuery(api.audits.listMyAudits, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">My Audits</h1>
          <p className="text-muted-foreground text-xs">
            Track draft, submitted, and finalized audits.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/audits/new" />}>New Audit</Button>
      </div>

      {audits.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-xs text-muted-foreground">
            No audits started yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => (
            <Card key={audit._id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{audit.templateTitle}</span>
                  <AuditStatusBadge status={audit.status} />
                </CardTitle>
                <CardDescription>
                  Version {audit.templateVersion}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Started {new Date(audit.startedAt).toLocaleString()}
                </p>
                <Button
                  nativeButton={false}
                  variant="outline"
                  render={<Link href={`/audits/${audit._id}`} />}
                >
                  Open
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
