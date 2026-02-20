import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const roleValidator = v.union(
  v.literal("auditor"),
  v.literal("manager"),
  v.literal("admin")
);

const templateStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published")
);

const questionTypeValidator = v.union(
  v.literal("text"),
  v.literal("number"),
  v.literal("boolean"),
  v.literal("select")
);

const auditStatusValidator = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("rejected"),
  v.literal("approved"),
  v.literal("signed_off")
);

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.string(),
    role: v.optional(roleValidator),
    createdAt: v.optional(v.number()),
    authUserId: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("role", ["role"])
    .index("authUserId", ["authUserId"]),

  auditTemplates: defineTable({
    templateKey: v.string(),
    title: v.string(),
    description: v.string(),
    version: v.number(),
    status: templateStatusValidator,
    createdBy: v.id("users"),
    createdAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("templateKey_version", ["templateKey", "version"])
    .index("status_createdAt", ["status", "createdAt"])
    .index("createdBy", ["createdBy"]),

  auditTemplateSections: defineTable({
    templateId: v.id("auditTemplates"),
    title: v.string(),
    order: v.number(),
  }).index("templateId_order", ["templateId", "order"]),

  auditQuestions: defineTable({
    sectionId: v.id("auditTemplateSections"),
    questionText: v.string(),
    type: questionTypeValidator,
    options: v.optional(v.array(v.string())),
    required: v.boolean(),
    order: v.number(),
  }).index("sectionId_order", ["sectionId", "order"]),

  audits: defineTable({
    templateId: v.id("auditTemplates"),
    templateVersion: v.number(),
    auditorId: v.id("users"),
    status: auditStatusValidator,
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
    managerId: v.optional(v.id("users")),
    managerComment: v.optional(v.string()),
    signedOffAt: v.optional(v.number()),
  })
    .index("auditorId_startedAt", ["auditorId", "startedAt"])
    .index("status_startedAt", ["status", "startedAt"])
    .index("managerId_startedAt", ["managerId", "startedAt"])
    .index("templateId_startedAt", ["templateId", "startedAt"]),

  auditAnswers: defineTable({
    auditId: v.id("audits"),
    questionId: v.id("auditQuestions"),
    value: v.union(v.string(), v.number(), v.boolean()),
    updatedAt: v.number(),
  })
    .index("auditId", ["auditId"])
    .index("auditId_questionId", ["auditId", "questionId"]),
});

