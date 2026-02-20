import { Badge } from "@/components/ui/badge";
import { AUDIT_STATUS_LABELS, TEMPLATE_STATUS_LABELS } from "@/lib/domain";

export function AuditStatusBadge({
  status,
}: {
  status: keyof typeof AUDIT_STATUS_LABELS;
}) {
  const variant =
    status === "signed_off"
      ? "default"
      : status === "approved"
        ? "secondary"
        : status === "rejected"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{AUDIT_STATUS_LABELS[status]}</Badge>;
}

export function TemplateStatusBadge({
  status,
}: {
  status: keyof typeof TEMPLATE_STATUS_LABELS;
}) {
  const variant = status === "published" ? "default" : "outline";
  return <Badge variant={variant}>{TEMPLATE_STATUS_LABELS[status]}</Badge>;
}
