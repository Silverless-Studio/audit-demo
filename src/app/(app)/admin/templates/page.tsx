import { AdminTemplatesPage } from "@/components/app/admin-templates-page";
import { requireSessionUser } from "@/lib/server-auth";

export default async function AdminTemplatesRoutePage() {
  await requireSessionUser(["admin"]);
  return <AdminTemplatesPage />;
}
