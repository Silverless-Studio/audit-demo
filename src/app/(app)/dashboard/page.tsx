import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/lib/convex-api";
import { requireSessionUser } from "@/lib/server-auth";

function MetricCard({ title, value, description }: { title: string; value: number; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireSessionUser();
  const summary = await fetchAuthQuery(api.dashboard.summary, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-xs">
            Overview for {user.name} ({user.role})
          </p>
        </div>
      </div>

      {summary.role === "auditor" ? (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Audits" value={summary.totalAudits} description="All audits you have started" />
          <MetricCard title="Drafts" value={summary.drafts} description="Audits still in progress" />
          <MetricCard title="Submitted" value={summary.submitted} description="Awaiting manager review" />
          <MetricCard title="Signed Off" value={summary.signedOff} description="Fully completed audits" />
        </div>
      ) : null}

      {summary.role === "manager" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Submitted" value={summary.submitted} description="Ready for review" />
          <MetricCard title="Approved" value={summary.approved} description="Approved and awaiting sign off" />
          <MetricCard title="Signed Off" value={summary.signedOff} description="Finalized audits" />
        </div>
      ) : null}

      {summary.role === "admin" ? (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Users" value={summary.users} description="All platform users" />
          <MetricCard title="Templates" value={summary.templates} description="All template versions" />
          <MetricCard title="Published Templates" value={summary.publishedTemplates} description="Templates available to auditors" />
          <MetricCard title="Audits" value={summary.audits} description="All audits in the system" />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Jump into your most common workflows.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(user.role === "auditor" || user.role === "admin") ? (
            <>
              <Button nativeButton={false} render={<Link href="/audits/new" />}>Start New Audit</Button>
              <Button nativeButton={false} variant="outline" render={<Link href="/audits" />}>
                View My Audits
              </Button>
            </>
          ) : null}
          {(user.role === "manager" || user.role === "admin") ? (
            <Button nativeButton={false} variant="outline" render={<Link href="/reviews" />}>
              Open Review Queue
            </Button>
          ) : null}
          {user.role === "admin" ? (
            <>
              <Button nativeButton={false} variant="outline" render={<Link href="/admin/templates" />}>
                Manage Templates
              </Button>
              <Button nativeButton={false} variant="outline" render={<Link href="/admin/users" />}>
                Manage Users
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
