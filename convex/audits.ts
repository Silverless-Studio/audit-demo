import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { answerValueValidator } from "./domain";
import { requireRole } from "./lib/authz";

const isRequiredAnswered = (value: string | number | boolean) => {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
};

const validateAnswerValue = (
  question: {
    type: "text" | "number" | "boolean" | "select";
    options?: string[];
  },
  value: string | number | boolean
) => {
  switch (question.type) {
    case "text":
      if (typeof value !== "string") {
        throw new ConvexError("Text question requires a string value");
      }
      return;
    case "number":
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new ConvexError("Number question requires a number value");
      }
      return;
    case "boolean":
      if (typeof value !== "boolean") {
        throw new ConvexError("Boolean question requires a true/false value");
      }
      return;
    case "select":
      if (typeof value !== "string") {
        throw new ConvexError("Select question requires a string value");
      }
      if (!question.options?.includes(value)) {
        throw new ConvexError("Invalid select option");
      }
      return;
    default:
      throw new ConvexError("Unsupported question type");
  }
};

const getAuditById = async (
  ctx: QueryCtx | MutationCtx,
  auditId: Id<"audits">
) => {
  const audit = await ctx.db.get(auditId);
  if (!audit) {
    throw new ConvexError("Audit not found");
  }
  return audit;
};

const getTemplateQuestions = async (
  ctx: QueryCtx | MutationCtx,
  templateId: Id<"auditTemplates">
) => {
  return ctx.db
    .query("auditQuestions")
    .withIndex("by_template_order", (q) => q.eq("templateId", templateId))
    .collect();
};

const getRequiredQuestionProgress = async (
  ctx: QueryCtx | MutationCtx,
  auditId: Id<"audits">,
  templateId: Id<"auditTemplates">
) => {
  const [questions, answers] = await Promise.all([
    getTemplateQuestions(ctx, templateId),
    ctx.db
      .query("auditAnswers")
      .withIndex("by_audit", (q) => q.eq("auditId", auditId))
      .collect(),
  ]);

  const answersByQuestionId = new Map<string, (typeof answers)[number]>();
  for (const answer of answers) {
    answersByQuestionId.set(answer.questionId, answer);
  }

  const required = questions.filter((question) => question.required);
  let requiredAnswered = 0;
  for (const question of required) {
    const answer = answersByQuestionId.get(question._id);
    if (answer && isRequiredAnswered(answer.value)) {
      requiredAnswered += 1;
    }
  }
  const requiredTotal = required.length;
  const requiredUnanswered = requiredTotal - requiredAnswered;
  const completionPercent =
    requiredTotal === 0
      ? 100
      : Math.round((requiredAnswered / requiredTotal) * 100);

  return {
    questions,
    answers,
    requiredAnswered,
    requiredTotal,
    requiredUnanswered,
    completionPercent,
  };
};

const canUserReadAudit = (
  user: { _id: Id<"users">; role: "auditor" | "manager" | "admin" },
  audit: { auditorId: Id<"users">; status: string }
) => {
  if (user.role === "admin") {
    return true;
  }
  if (user.role === "auditor") {
    return user._id === audit.auditorId;
  }
  if (user.role === "manager") {
    return audit.status !== "draft";
  }
  return false;
};

export const startAudit = mutation({
  args: {
    templateId: v.id("auditTemplates"),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["auditor", "admin"]);
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new ConvexError("Template not found");
    }
    if (template.status !== "published") {
      throw new ConvexError("Only published templates can be used");
    }
    const now = Date.now();
    const id = await ctx.db.insert("audits", {
      templateId: template._id,
      templateVersion: template.version,
      auditorId: user._id,
      status: "draft",
      startedAt: now,
      lastUpdatedAt: now,
    });
    return id;
  },
});

export const listMyAudits = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, ["auditor", "admin"]);
    const audits = await ctx.db
      .query("audits")
      .withIndex("by_auditor", (q) => q.eq("auditorId", user._id))
      .collect();
    const sorted = audits.sort((a, b) => b.startedAt - a.startedAt);
    const templateIds = [...new Set(sorted.map((audit) => audit.templateId))];
    const templates = await Promise.all(templateIds.map((id) => ctx.db.get(id)));
    const templateById = new Map(
      templates.filter(Boolean).map((template) => [template!._id, template!])
    );
    return sorted.map((audit) => ({
      ...audit,
      templateTitle: templateById.get(audit.templateId)?.title ?? "Unknown template",
    }));
  },
});

export const getAuditEditor = query({
  args: {
    auditId: v.id("audits"),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["auditor", "manager", "admin"]);
    const audit = await getAuditById(ctx, args.auditId);
    if (!canUserReadAudit(user, audit)) {
      throw new ConvexError("Forbidden");
    }

    const template = await ctx.db.get(audit.templateId);
    if (!template) {
      throw new ConvexError("Template not found");
    }
    const sections = await ctx.db
      .query("auditTemplateSections")
      .withIndex("by_template_order", (q) => q.eq("templateId", template._id))
      .collect();

    const {
      questions,
      answers,
      requiredAnswered,
      requiredTotal,
      requiredUnanswered,
      completionPercent,
    } = await getRequiredQuestionProgress(ctx, audit._id, template._id);

    const questionsBySection = new Map<string, typeof questions>();
    for (const question of questions) {
      const key = question.sectionId;
      const bucket = questionsBySection.get(key) ?? [];
      bucket.push(question);
      questionsBySection.set(key, bucket);
    }

    const [auditor, manager] = await Promise.all([
      ctx.db.get(audit.auditorId),
      audit.managerId ? ctx.db.get(audit.managerId) : Promise.resolve(null),
    ]);

    const canEdit =
      audit.status === "draft" &&
      (user.role === "admin" || user._id === audit.auditorId);

    return {
      audit,
      template,
      meta: {
        auditorName: auditor?.name ?? "Unknown auditor",
        managerName: manager?.name ?? null,
      },
      sections: sections.map((section) => ({
        ...section,
        questions: (questionsBySection.get(section._id) ?? []).sort(
          (a, b) => a.order - b.order
        ),
      })),
      answers: answers.map((answer) => ({
        _id: answer._id,
        questionId: answer.questionId,
        value: answer.value,
      })),
      progress: {
        requiredAnswered,
        requiredTotal,
        requiredUnanswered,
        completionPercent,
      },
      permissions: {
        canEdit,
        canSubmit: canEdit && requiredUnanswered === 0,
        canApprove:
          (user.role === "manager" || user.role === "admin") &&
          audit.status === "submitted",
        canReject:
          (user.role === "manager" || user.role === "admin") &&
          audit.status === "submitted",
        canSignOff:
          (user.role === "manager" || user.role === "admin") &&
          audit.status === "approved",
      },
    };
  },
});

export const saveAnswer = mutation({
  args: {
    auditId: v.id("audits"),
    questionId: v.id("auditQuestions"),
    value: answerValueValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["auditor", "admin"]);
    const audit = await getAuditById(ctx, args.auditId);
    if (audit.status !== "draft") {
      throw new ConvexError("Only draft audits can be edited");
    }
    if (user.role === "auditor" && audit.auditorId !== user._id) {
      throw new ConvexError("Forbidden");
    }

    const question = await ctx.db.get(args.questionId);
    if (!question || question.templateId !== audit.templateId) {
      throw new ConvexError("Question does not belong to the audit template");
    }

    validateAnswerValue(question, args.value);

    const existing = await ctx.db
      .query("auditAnswers")
      .withIndex("by_audit_question", (q) =>
        q.eq("auditId", args.auditId).eq("questionId", args.questionId)
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value, updatedAt: now });
      await ctx.db.patch(audit._id, { lastUpdatedAt: now });
      return existing._id;
    }
    const answerId = await ctx.db.insert("auditAnswers", {
      auditId: args.auditId,
      questionId: args.questionId,
      value: args.value,
      updatedAt: now,
    });
    await ctx.db.patch(audit._id, { lastUpdatedAt: now });
    return answerId;
  },
});

export const submitAudit = mutation({
  args: {
    auditId: v.id("audits"),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["auditor", "admin"]);
    const audit = await getAuditById(ctx, args.auditId);
    if (audit.status !== "draft") {
      throw new ConvexError("Only draft audits can be submitted");
    }
    if (user.role === "auditor" && audit.auditorId !== user._id) {
      throw new ConvexError("Forbidden");
    }

    const progress = await getRequiredQuestionProgress(
      ctx,
      audit._id,
      audit.templateId
    );
    if (progress.requiredUnanswered > 0) {
      throw new ConvexError(
        `Please answer all required questions (${progress.requiredUnanswered} remaining)`
      );
    }

    const now = Date.now();
    await ctx.db.patch(audit._id, {
      status: "submitted",
      submittedAt: now,
      lastUpdatedAt: now,
    });
    return (await ctx.db.get(audit._id))!;
  },
});

export const listReviewQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["manager", "admin"]);
    const [submitted, approved] = await Promise.all([
      ctx.db
        .query("audits")
        .withIndex("by_status", (q) => q.eq("status", "submitted"))
        .collect(),
      ctx.db
        .query("audits")
        .withIndex("by_status", (q) => q.eq("status", "approved"))
        .collect(),
    ]);
    const audits = [...submitted, ...approved].sort((a, b) => {
      const aSort = a.submittedAt ?? a.startedAt;
      const bSort = b.submittedAt ?? b.startedAt;
      return bSort - aSort;
    });

    const templateIds = [...new Set(audits.map((audit) => audit.templateId))];
    const templates = await Promise.all(templateIds.map((id) => ctx.db.get(id)));
    const templateById = new Map(
      templates.filter(Boolean).map((template) => [template!._id, template!])
    );

    const auditorIds = [...new Set(audits.map((audit) => audit.auditorId))];
    const auditors = await Promise.all(auditorIds.map((id) => ctx.db.get(id)));
    const auditorById = new Map(
      auditors.filter(Boolean).map((auditor) => [auditor!._id, auditor!])
    );

    return audits.map((audit) => ({
      ...audit,
      templateTitle: templateById.get(audit.templateId)?.title ?? "Unknown template",
      auditorName: auditorById.get(audit.auditorId)?.name ?? "Unknown auditor",
    }));
  },
});

export const listAllAudits = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    const audits = await ctx.db.query("audits").collect();
    return audits.sort((a, b) => b.startedAt - a.startedAt);
  },
});

export const managerApprove = mutation({
  args: {
    auditId: v.id("audits"),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["manager", "admin"]);
    const audit = await getAuditById(ctx, args.auditId);
    if (audit.status !== "submitted") {
      throw new ConvexError("Only submitted audits can be approved");
    }
    await ctx.db.patch(audit._id, {
      status: "approved",
      managerId: user._id,
      managerComment: undefined,
      lastUpdatedAt: Date.now(),
    });
    return (await ctx.db.get(audit._id))!;
  },
});

export const managerReject = mutation({
  args: {
    auditId: v.id("audits"),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["manager", "admin"]);
    const audit = await getAuditById(ctx, args.auditId);
    if (audit.status !== "submitted") {
      throw new ConvexError("Only submitted audits can be rejected");
    }
    const comment = args.comment.trim();
    if (comment.length === 0) {
      throw new ConvexError("A rejection comment is required");
    }
    await ctx.db.patch(audit._id, {
      status: "rejected",
      managerId: user._id,
      managerComment: comment,
      lastUpdatedAt: Date.now(),
    });
    return (await ctx.db.get(audit._id))!;
  },
});

export const managerSignOff = mutation({
  args: {
    auditId: v.id("audits"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["manager", "admin"]);
    const audit = await getAuditById(ctx, args.auditId);
    if (audit.status !== "approved") {
      throw new ConvexError("Only approved audits can be signed off");
    }
    const now = Date.now();
    await ctx.db.patch(audit._id, {
      status: "signed_off",
      signedOffAt: now,
      lastUpdatedAt: now,
    });
    return (await ctx.db.get(audit._id))!;
  },
});
