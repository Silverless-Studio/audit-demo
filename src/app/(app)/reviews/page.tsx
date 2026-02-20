import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/lib/convex-api";
import { requireSessionUser } from "@/lib/server-auth";
import { AuditStatusBadge } from "@/components/app/status-badges";

export default async function ReviewsPage() {
  await requireSessionUser(["manager", "admin"]);
  const audits = await fetchAuthQuery(api.audits.listReviewQueue, {});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Review Queue</h1>
        <p className="text-muted-foreground text-xs">
          Submitted and approved audits requiring manager action.
        </p>
      </div>
      {audits.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-xs text-muted-foreground">
            No audits are waiting for review.
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
                  Auditor: {audit.auditorName} · Version {audit.templateVersion}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Submitted{" "}
                  {audit.submittedAt
                    ? new Date(audit.submittedAt).toLocaleString()
                    : "not yet"}
                </p>
                <Button
                  nativeButton={false}
                  variant="outline"
                  render={<Link href={`/reviews/${audit._id}`} />}
                >
                  Review
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
