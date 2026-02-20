import { Id } from "../../../../../../convex/_generated/dataModel";
import { TemplateBuilder } from "@/components/app/template-builder";
import { requireSessionUser } from "@/lib/server-auth";

export default async function AdminTemplateBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSessionUser(["admin"]);
  const resolvedParams = await params;
  return <TemplateBuilder templateId={resolvedParams.id as Id<"auditTemplates">} />;
}
