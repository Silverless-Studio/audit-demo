import { v } from "convex/values";

export const APP_ROLES = ["auditor", "manager", "admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];
export const appRoleValidator = v.union(
  v.literal("auditor"),
  v.literal("manager"),
  v.literal("admin")
);

export const TEMPLATE_STATUSES = ["draft", "published"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];
export const templateStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published")
);

export const QUESTION_TYPES = ["text", "number", "boolean", "select"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export const questionTypeValidator = v.union(
  v.literal("text"),
  v.literal("number"),
  v.literal("boolean"),
  v.literal("select")
);

export const AUDIT_STATUSES = [
  "draft",
  "submitted",
  "rejected",
  "approved",
  "signed_off",
] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];
export const auditStatusValidator = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("rejected"),
  v.literal("approved"),
  v.literal("signed_off")
);

export const answerValueValidator = v.union(v.string(), v.number(), v.boolean());
