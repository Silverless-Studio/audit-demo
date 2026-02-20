export const APP_ROLES = ["auditor", "manager", "admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const AUDIT_STATUSES = [
  "draft",
  "submitted",
  "rejected",
  "approved",
  "signed_off",
] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export const TEMPLATE_STATUSES = ["draft", "published"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const QUESTION_TYPES = ["text", "number", "boolean", "select"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  auditor: "Auditor",
  manager: "Manager",
  admin: "Admin",
};

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  rejected: "Rejected",
  approved: "Approved",
  signed_off: "Signed Off",
};

export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  draft: "Draft",
  published: "Published",
};
