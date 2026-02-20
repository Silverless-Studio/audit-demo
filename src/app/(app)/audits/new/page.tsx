import { NewAuditPage } from "@/components/app/new-audit-page";
import { requireSessionUser } from "@/lib/server-auth";

export default async function NewAuditRoutePage() {
  await requireSessionUser(["auditor", "admin"]);
  return <NewAuditPage />;
}
