import { Id } from "../../../../../convex/_generated/dataModel";
import { AuditEditor } from "@/components/app/audit-editor";
import { requireSessionUser } from "@/lib/server-auth";

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSessionUser(["auditor", "admin"]);
  const resolvedParams = await params;
  return <AuditEditor auditId={resolvedParams.id as Id<"audits">} />;
}
