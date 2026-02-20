import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireRole, requireViewer, Viewer } from "./auth";

const answerValueValidator = v.union(v.string(), v.number(), v.boolean());

const isAnswered = (value: string | number | boolean) => {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
};

const canViewAudit = (viewer: Viewer, audit: { auditorId: Id<"users">; status: string }) => {
  if (viewer.user.role === "admin") {
    return true;
  }
  if (audit.auditorId === viewer.user._id) {
    return true;
  }
  if (viewer.user.role === "manager") {
    return audit.status !== "draft";
  }
  return false;
};

const canEditAuditAnswers = (
  viewer: Viewer,
  audit: { auditorId: Id<"users">; status: string },
) => {
  if (audit.status !== "draft") {
    return false;
  }

  if (viewer.user.role === "admin") {
    return true;
  }

  return viewer.user.role === "auditor" && audit.auditorId === viewer.user._id;
};

const loadTemplateSectionsWithQuestions = async (
  ctx: QueryCtx | MutationCtx,
  templateId: Id<"auditTemplates">,
) => {
  const sections = await ctx.db
    .query("auditTemplateSections")
    .withIndex("templateId_order", (q) => q.eq("templateId", templateId))
    .collect();

  const mappedSections = [] as Array<{
    _id: Id<"auditTemplateSections">;
    title: string;
    order: number;
    questions: Array<{
      _id: Id<"auditQuestions">;
      questionText: string;
      type: "text" | "number" | "boolean" | "select";
      required: boolean;
      options?: string[];
      order: number;
    }>;
  }>;

  for (const section of sections.sort((a, b) => a.order - b.order)) {
    const questions = await ctx.db
      .query("auditQuestions")
      .withIndex("sectionId_order", (q) => q.eq("sectionId", section._id))
      .collect();

    mappedSections.push({
      _id: section._id,
      title: section.title,
      order: section.order,
      questions: questions.sort((a, b) => a.order - b.order),
    });
  }

  return mappedSections;
};

const validateAnswerType = (
  question: {
    type: "text" | "number" | "boolean" | "select";
    options?: string[];
  },
  value: string | number | boolean,
) => {
  if (question.type === "number" && typeof value !== "number") {
    throw new Error("Number question expects a number answer");
  }

  if ((question.type === "text" || question.type === "select") && typeof value !== "string") {
    throw new Error("Text and select questions expect string answers");
  }

  if (question.type === "boolean" && typeof value !== "boolean") {
    throw new Error("Boolean question expects true or false");
  }

  if (
    question.type === "select" &&
    typeof value === "string" &&
    question.options &&
    !question.options.includes(value)
  ) {
    throw new Error("Answer is not in the configured select options");
  }
};

const getAuditAndQuestionOrThrow = async (
  ctx: QueryCtx | MutationCtx,
  auditId: Id<"audits">,
  questionId: Id<"auditQuestions">,
) => {
  const audit = await ctx.db.get(auditId);
  if (!audit) {
    throw new Error("Audit not found");
  }

  const question = await ctx.db.get(questionId);
  if (!question) {
    throw new Error("Question not found");
  }

  const section = await ctx.db.get(question.sectionId);
  if (!section || section.templateId !== audit.templateId) {
    throw new Error("Question does not belong to this audit template");
  }

  return { audit, question };
};

export const listMyAudits = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const mapWithTemplate = async (audits: Array<{
      _id: Id<"audits">;
      _creationTime: number;
      templateId: Id<"auditTemplates">;
      templateVersion: number;
      auditorId: Id<"users">;
      status: "draft" | "submitted" | "rejected" | "approved" | "signed_off";
      startedAt: number;
      submittedAt?: number;
      managerId?: Id<"users">;
      managerComment?: string;
      signedOffAt?: number;
    }>) => {
      const rows = [] as Array<
        (typeof audits)[number] & {
          templateTitle: string;
        }
      >;

      for (const audit of audits) {
        const template = await ctx.db.get(audit.templateId);
        rows.push({
          ...audit,
          templateTitle: template?.title ?? "Unknown template",
        });
      }

      return rows;
    };

    if (viewer.user.role === "auditor") {
      const audits = await ctx.db
        .query("audits")
        .withIndex("auditorId_startedAt", (q) => q.eq("auditorId", viewer.user._id))
        .collect();
      return mapWithTemplate(audits.sort((a, b) => b.startedAt - a.startedAt));
    }

    if (viewer.user.role === "admin") {
      const audits = await ctx.db.query("audits").collect();
      return mapWithTemplate(audits.sort((a, b) => b.startedAt - a.startedAt));
    }

    throw new Error("Only auditors and admins can view this page");
  },
});

export const listReviewAudits = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    requireRole(viewer, "manager");

    const audits = await ctx.db.query("audits").collect();
    const filtered = audits
      .filter((audit) => audit.status !== "draft")
      .sort((a, b) => b.startedAt - a.startedAt);

    const rows = [] as Array<
      (typeof filtered)[number] & {
        templateTitle: string;
        auditorName: string;
      }
    >;

    for (const audit of filtered) {
      const template = await ctx.db.get(audit.templateId);
      const auditor = await ctx.db.get(audit.auditorId);
      rows.push({
        ...audit,
        templateTitle: template?.title ?? "Unknown template",
        auditorName: auditor?.name ?? auditor?.email ?? "Unknown auditor",
      });
    }

    return rows;
  },
});

export const getAuditDetails = query({
  args: {
    auditId: v.id("audits"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const audit = await ctx.db.get(args.auditId);
    if (!audit) {
      throw new Error("Audit not found");
    }

    if (!canViewAudit(viewer, audit)) {
      throw new Error("Forbidden");
    }

    const template = await ctx.db.get(audit.templateId);
    if (!template) {
      throw new Error("Template missing");
    }

    const sections = await loadTemplateSectionsWithQuestions(ctx, template._id);
    const answers = await ctx.db
      .query("auditAnswers")
      .withIndex("auditId", (q) => q.eq("auditId", audit._id))
      .collect();

    const answerByQuestionId = new Map<string, (typeof answers)[number]>();
    for (const answer of answers) {
      answerByQuestionId.set(answer.questionId, answer);
    }

    const sectionsWithAnswers = sections.map((section) => ({
      ...section,
      questions: section.questions.map((question) => ({
        ...question,
        answer: answerByQuestionId.get(question._id) ?? null,
      })),
    }));

    const allQuestions = sections.flatMap((section) => section.questions);
    const answeredCount = allQuestions.filter((question) => {
      const answer = answerByQuestionId.get(question._id);
      if (!answer) {
        return false;
      }
      return isAnswered(answer.value);
    }).length;

    const requiredUnansweredIds = allQuestions
      .filter((question) => question.required)
      .filter((question) => {
        const answer = answerByQuestionId.get(question._id);
        if (!answer) {
          return true;
        }
        return !isAnswered(answer.value);
      })
      .map((question) => question._id);

    return {
      audit,
      template,
      sections: sectionsWithAnswers,
      completion: {
        totalQuestions: allQuestions.length,
        answeredQuestions: answeredCount,
        requiredUnansweredCount: requiredUnansweredIds.length,
        requiredUnansweredIds,
      },
      permissions: {
        canEditAnswers: canEditAuditAnswers(viewer, audit),
        canSubmit:
          canEditAuditAnswers(viewer, audit) && requiredUnansweredIds.length === 0,
        canReview:
          (viewer.user.role === "manager" || viewer.user.role === "admin") &&
          audit.status === "submitted",
        canSignOff:
          (viewer.user.role === "manager" || viewer.user.role === "admin") &&
          audit.status === "approved",
      },
    };
  },
});

export const startAudit = mutation({
  args: {
    templateId: v.id("auditTemplates"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    if (viewer.user.role !== "auditor" && viewer.user.role !== "admin") {
      throw new Error("Only auditors and admins can start an audit");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    if (template.status !== "published") {
      throw new Error("Only published templates can be used");
    }

    const auditId = await ctx.db.insert("audits", {
      templateId: template._id,
      templateVersion: template.version,
      auditorId: viewer.user._id,
      status: "draft",
      startedAt: Date.now(),
    });

    return auditId;
  },
});

export const saveAnswer = mutation({
  args: {
    auditId: v.id("audits"),
    questionId: v.id("auditQuestions"),
    value: answerValueValidator,
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const { audit, question } = await getAuditAndQuestionOrThrow(
      ctx,
      args.auditId,
      args.questionId,
    );

    if (!canEditAuditAnswers(viewer, audit)) {
      throw new Error("Audit answers are locked");
    }

    validateAnswerType(question, args.value);

    const existing = await ctx.db
      .query("auditAnswers")
      .withIndex("auditId_questionId", (q) =>
        q.eq("auditId", audit._id).eq("questionId", question._id),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return ctx.db.insert("auditAnswers", {
      auditId: audit._id,
      questionId: question._id,
      value: args.value,
      updatedAt: Date.now(),
    });
  },
});

export const clearAnswer = mutation({
  args: {
    auditId: v.id("audits"),
    questionId: v.id("auditQuestions"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const { audit, question } = await getAuditAndQuestionOrThrow(
      ctx,
      args.auditId,
      args.questionId,
    );

    if (!canEditAuditAnswers(viewer, audit)) {
      throw new Error("Audit answers are locked");
    }

    const existing = await ctx.db
      .query("auditAnswers")
      .withIndex("auditId_questionId", (q) =>
        q.eq("auditId", audit._id).eq("questionId", question._id),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { ok: true };
  },
});

export const submitAudit = mutation({
  args: {
    auditId: v.id("audits"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const audit = await ctx.db.get(args.auditId);
    if (!audit) {
      throw new Error("Audit not found");
    }

    if (!canEditAuditAnswers(viewer, audit)) {
      throw new Error("Only the assigned auditor can submit this draft");
    }

    const sections = await loadTemplateSectionsWithQuestions(ctx, audit.templateId);
    const requiredQuestions = sections
      .flatMap((section) => section.questions)
      .filter((question) => question.required);

    const answers = await ctx.db
      .query("auditAnswers")
      .withIndex("auditId", (q) => q.eq("auditId", audit._id))
      .collect();

    const answerByQuestionId = new Map<string, (typeof answers)[number]>();
    for (const answer of answers) {
      answerByQuestionId.set(answer.questionId, answer);
    }

    const missingRequired = requiredQuestions.filter((question) => {
      const answer = answerByQuestionId.get(question._id);
      if (!answer) {
        return true;
      }
      return !isAnswered(answer.value);
    });

    if (missingRequired.length > 0) {
      throw new Error("All required questions must be answered before submission");
    }

    await ctx.db.patch(audit._id, {
      status: "submitted",
      submittedAt: Date.now(),
      managerComment: undefined,
      managerId: undefined,
      signedOffAt: undefined,
    });

    return { ok: true };
  },
});

export const reviewAudit = mutation({
  args: {
    auditId: v.id("audits"),
    decision: v.union(v.literal("approve"), v.literal("reject")),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    requireRole(viewer, "manager");

    const audit = await ctx.db.get(args.auditId);
    if (!audit) {
      throw new Error("Audit not found");
    }

    if (audit.status !== "submitted") {
      throw new Error("Only submitted audits can be reviewed");
    }

    if (args.decision === "reject" && !args.comment?.trim()) {
      throw new Error("Rejection comment is required");
    }

    await ctx.db.patch(audit._id, {
      status: args.decision === "approve" ? "approved" : "rejected",
      managerId: viewer.user._id,
      managerComment:
        args.decision === "reject" ? args.comment?.trim() ?? "" : undefined,
    });

    return { ok: true };
  },
});

export const signOffAudit = mutation({
  args: {
    auditId: v.id("audits"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    requireRole(viewer, "manager");

    const audit = await ctx.db.get(args.auditId);
    if (!audit) {
      throw new Error("Audit not found");
    }

    if (audit.status !== "approved") {
      throw new Error("Only approved audits can be signed off");
    }

    await ctx.db.patch(audit._id, {
      status: "signed_off",
      managerId: viewer.user._id,
      signedOffAt: Date.now(),
    });

    return { ok: true };
  },
});

export const getDashboardSummary = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);

    if (viewer.user.role === "auditor") {
      const audits = await ctx.db
        .query("audits")
        .withIndex("auditorId_startedAt", (q) => q.eq("auditorId", viewer.user._id))
        .collect();

      return {
        role: viewer.user.role,
        totalAudits: audits.length,
        drafts: audits.filter((audit) => audit.status === "draft").length,
        submitted: audits.filter((audit) => audit.status === "submitted").length,
        approved: audits.filter((audit) => audit.status === "approved").length,
        signedOff: audits.filter((audit) => audit.status === "signed_off").length,
      };
    }

    if (viewer.user.role === "manager") {
      const audits = await ctx.db.query("audits").collect();
      return {
        role: viewer.user.role,
        pendingReview: audits.filter((audit) => audit.status === "submitted").length,
        rejected: audits.filter((audit) => audit.status === "rejected").length,
        approved: audits.filter((audit) => audit.status === "approved").length,
        signedOff: audits.filter((audit) => audit.status === "signed_off").length,
      };
    }

    const [audits, templates, users] = await Promise.all([
      ctx.db.query("audits").collect(),
      ctx.db.query("auditTemplates").collect(),
      ctx.db.query("users").collect(),
    ]);

    return {
      role: viewer.user.role,
      totalAudits: audits.length,
      totalUsers: users.length,
      templates: templates.length,
      publishedTemplates: templates.filter((template) => template.status === "published")
        .length,
    };
  },
});

