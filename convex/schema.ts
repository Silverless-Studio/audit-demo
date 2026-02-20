import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  answerValueValidator,
  appRoleValidator,
  auditStatusValidator,
  questionTypeValidator,
  templateStatusValidator,
} from "./domain";

export default defineSchema({
  users: defineTable({
    authUserId: v.string(),
    name: v.string(),
    email: v.string(),
    role: appRoleValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_user_id", ["authUserId"])
    .index("by_role", ["role"]),

  auditTemplates: defineTable({
    templateFamilyId: v.string(),
    title: v.string(),
    description: v.string(),
    version: v.number(),
    status: templateStatusValidator,
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_family", ["templateFamilyId"])
    .index("by_family_version", ["templateFamilyId", "version"])
    .index("by_status", ["status"])
    .index("by_status_created_at", ["status", "createdAt"]),

  auditTemplateSections: defineTable({
    templateId: v.id("auditTemplates"),
    title: v.string(),
    order: v.number(),
  }).index("by_template_order", ["templateId", "order"]),

  auditQuestions: defineTable({
    templateId: v.id("auditTemplates"),
    sectionId: v.id("auditTemplateSections"),
    questionText: v.string(),
    type: questionTypeValidator,
    options: v.optional(v.array(v.string())),
    required: v.boolean(),
    order: v.number(),
  })
    .index("by_section_order", ["sectionId", "order"])
    .index("by_template_order", ["templateId", "order"]),

  audits: defineTable({
    templateId: v.id("auditTemplates"),
    templateVersion: v.number(),
    auditorId: v.id("users"),
    status: auditStatusValidator,
    startedAt: v.number(),
    lastUpdatedAt: v.number(),
    submittedAt: v.optional(v.number()),
    managerId: v.optional(v.id("users")),
    managerComment: v.optional(v.string()),
    signedOffAt: v.optional(v.number()),
  })
    .index("by_auditor", ["auditorId"])
    .index("by_auditor_status", ["auditorId", "status"])
    .index("by_status", ["status"])
    .index("by_manager", ["managerId"]),

  auditAnswers: defineTable({
    auditId: v.id("audits"),
    questionId: v.id("auditQuestions"),
    value: answerValueValidator,
    updatedAt: v.number(),
  })
    .index("by_audit", ["auditId"])
    .index("by_audit_question", ["auditId", "questionId"]),
});
