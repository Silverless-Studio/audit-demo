import { AdminUsersPage } from "@/components/app/admin-users-page";
import { requireSessionUser } from "@/lib/server-auth";

export default async function AdminUsersRoutePage() {
  await requireSessionUser(["admin"]);
  return <AdminUsersPage />;
}
