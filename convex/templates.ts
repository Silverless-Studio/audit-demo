import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireRole, requireViewer } from "./auth";

const questionInputValidator = v.object({
  questionText: v.string(),
  type: v.union(
    v.literal("text"),
    v.literal("number"),
    v.literal("boolean"),
    v.literal("select"),
  ),
  options: v.optional(v.array(v.string())),
  required: v.boolean(),
});

const sectionInputValidator = v.object({
  title: v.string(),
  questions: v.array(questionInputValidator),
});

const loadTemplateStructure = async (
  ctx: QueryCtx | MutationCtx,
  templateId: Id<"auditTemplates">,
) => {
  const sections = await ctx.db
    .query("auditTemplateSections")
    .withIndex("templateId_order", (q) => q.eq("templateId", templateId))
    .collect();

  const fullSections = [] as Array<{
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

    fullSections.push({
      _id: section._id,
      title: section.title,
      order: section.order,
      questions: questions.sort((a, b) => a.order - b.order),
    });
  }

  return fullSections;
};

export const listAdminTemplates = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    requireRole(viewer, "admin");

    const templates = await ctx.db.query("auditTemplates").collect();
    return templates.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listPublishedTemplatesForStart = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    if (viewer.user.role !== "auditor" && viewer.user.role !== "admin") {
      throw new Error("Only auditors and admins can start audits");
    }

    const publishedTemplates = await ctx.db
      .query("auditTemplates")
      .withIndex("status_createdAt", (q) => q.eq("status", "published"))
      .collect();

    const latestByKey = new Map<string, (typeof publishedTemplates)[number]>();
    for (const template of publishedTemplates) {
      const current = latestByKey.get(template.templateKey);
      if (!current || template.version > current.version) {
        latestByKey.set(template.templateKey, template);
      }
    }

    return Array.from(latestByKey.values()).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  },
});

export const getTemplateEditor = query({
  args: { templateId: v.id("auditTemplates") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    requireRole(viewer, "admin");

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const sections = await loadTemplateStructure(ctx, template._id);
    return {
      template,
      sections,
    };
  },
});

export const createTemplateDraft = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    sections: v.optional(v.array(sectionInputValidator)),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    requireRole(viewer, "admin");

    const templateId = await ctx.db.insert("auditTemplates", {
      templateKey: crypto.randomUUID(),
      title: args.title.trim(),
      description: args.description.trim(),
      version: 1,
      status: "draft",
      createdBy: viewer.user._id,
      createdAt: Date.now(),
    });

    for (const [sectionIndex, section] of (args.sections ?? []).entries()) {
      const sectionId = await ctx.db.insert("auditTemplateSections", {
        templateId,
        title: section.title.trim(),
        order: sectionIndex,
      });

      for (const [questionIndex, question] of section.questions.entries()) {
        if (question.type === "select" && (!question.options || question.options.length === 0)) {
          throw new Error("Select questions must include options");
        }

        await ctx.db.insert("auditQuestions", {
          sectionId,
          questionText: question.questionText.trim(),
          type: question.type,
          options:
            question.type === "select"
              ? (question.options ?? []).map((option) => option.trim()).filter(Boolean)
              : undefined,
          required: question.required,
          order: questionIndex,
        });
      }
    }

    return templateId;
  },
});

export const createTemplateVersionFromExisting = mutation({
  args: {
    sourceTemplateId: v.id("auditTemplates"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    requireRole(viewer, "admin");

    const source = await ctx.db.get(args.sourceTemplateId);
    if (!source) {
      throw new Error("Source template not found");
    }

    const versions = await ctx.db
      .query("auditTemplates")
      .withIndex("templateKey_version", (q) => q.eq("templateKey", source.templateKey))
      .collect();

    const maxVersion = versions.reduce((max, item) => Math.max(max, item.version), 0);

    const newTemplateId = await ctx.db.insert("auditTemplates", {
      templateKey: source.templateKey,
      title: source.title,
      description: source.description,
      version: maxVersion + 1,
      status: "draft",
      createdBy: viewer.user._id,
      createdAt: Date.now(),
    });

    const sections = await loadTemplateStructure(ctx, source._id);

    for (const section of sections) {
      const newSectionId = await ctx.db.insert("auditTemplateSections", {
        templateId: newTemplateId,
        title: section.title,
        order: section.order,
      });

      for (const question of section.questions) {
        await ctx.db.insert("auditQuestions", {
          sectionId: newSectionId,
          questionText: question.questionText,
          type: question.type,
          options: question.options,
          required: question.required,
          order: question.order,
        });
      }
    }

    return newTemplateId;
  },
});

export const updateTemplateDraft = mutation({
  args: {
    templateId: v.id("auditTemplates"),
    title: v.string(),
    description: v.string(),
    sections: v.array(sectionInputValidator),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    requireRole(viewer, "admin");

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    if (template.status !== "draft") {
      throw new Error("Only draft templates can be edited");
    }

    await ctx.db.patch(template._id, {
      title: args.title.trim(),
      description: args.description.trim(),
    });

    const existingSections = await ctx.db
      .query("auditTemplateSections")
      .withIndex("templateId_order", (q) => q.eq("templateId", template._id))
      .collect();

    for (const section of existingSections) {
      const existingQuestions = await ctx.db
        .query("auditQuestions")
        .withIndex("sectionId_order", (q) => q.eq("sectionId", section._id))
        .collect();

      for (const question of existingQuestions) {
        await ctx.db.delete(question._id);
      }

      await ctx.db.delete(section._id);
    }

    for (const [sectionIndex, section] of args.sections.entries()) {
      const sectionId = await ctx.db.insert("auditTemplateSections", {
        templateId: template._id,
        title: section.title.trim(),
        order: sectionIndex,
      });

      for (const [questionIndex, question] of section.questions.entries()) {
        if (question.type === "select" && (!question.options || question.options.length === 0)) {
          throw new Error("Select questions must include options");
        }

        await ctx.db.insert("auditQuestions", {
          sectionId,
          questionText: question.questionText.trim(),
          type: question.type,
          options:
            question.type === "select"
              ? (question.options ?? []).map((option) => option.trim()).filter(Boolean)
              : undefined,
          required: question.required,
          order: questionIndex,
        });
      }
    }

    return { ok: true };
  },
});

export const publishTemplate = mutation({
  args: { templateId: v.id("auditTemplates") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    requireRole(viewer, "admin");

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    if (template.status !== "draft") {
      throw new Error("Template is already published");
    }

    const sections = await ctx.db
      .query("auditTemplateSections")
      .withIndex("templateId_order", (q) => q.eq("templateId", template._id))
      .collect();

    if (sections.length === 0) {
      throw new Error("Template must include at least one section");
    }

    for (const section of sections) {
      const questions = await ctx.db
        .query("auditQuestions")
        .withIndex("sectionId_order", (q) => q.eq("sectionId", section._id))
        .collect();
      if (questions.length === 0) {
        throw new Error("Every section must include at least one question");
      }
    }

    await ctx.db.patch(template._id, {
      status: "published",
      publishedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const deleteTemplateDraft = mutation({
  args: { templateId: v.id("auditTemplates") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    requireRole(viewer, "admin");

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    if (template.status !== "draft") {
      throw new Error("Only draft templates can be deleted");
    }

    const existingAudit = await ctx.db
      .query("audits")
      .withIndex("templateId_startedAt", (q) => q.eq("templateId", template._id))
      .first();
    if (existingAudit) {
      throw new Error("Cannot delete draft template that has audits");
    }

    const sections = await ctx.db
      .query("auditTemplateSections")
      .withIndex("templateId_order", (q) => q.eq("templateId", template._id))
      .collect();

    for (const section of sections) {
      const questions = await ctx.db
        .query("auditQuestions")
        .withIndex("sectionId_order", (q) => q.eq("sectionId", section._id))
        .collect();

      for (const question of questions) {
        await ctx.db.delete(question._id);
      }

      await ctx.db.delete(section._id);
    }

    await ctx.db.delete(template._id);
    return { ok: true };
  },
});

