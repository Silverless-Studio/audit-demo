import { Id } from "../../../../../convex/_generated/dataModel";
import { ReviewPanel } from "@/components/app/review-panel";
import { requireSessionUser } from "@/lib/server-auth";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSessionUser(["manager", "admin"]);
  const resolvedParams = await params;
  return <ReviewPanel auditId={resolvedParams.id as Id<"audits">} />;
}
