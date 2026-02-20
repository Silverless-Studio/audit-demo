import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/lib/convex-api";
import { requireSessionUser } from "@/lib/server-auth";

export default async function AdminPage() {
  await requireSessionUser(["admin"]);
  const summary = await fetchAuthQuery(api.dashboard.summary, {});

  if (summary.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Admin Console</h1>
        <p className="text-muted-foreground text-xs">
          Manage templates, users, and platform-wide audit activity.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.users}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.templates}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Published</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.publishedTemplates}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Audits</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.audits}</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Management</CardTitle>
          <CardDescription>Open core admin tools.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href="/admin/templates" />}>Templates</Button>
          <Button nativeButton={false} variant="outline" render={<Link href="/admin/users" />}>
            Users & Roles
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
