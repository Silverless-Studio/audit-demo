import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { questionTypeValidator } from "./domain";
import { requireRole } from "./lib/authz";

const normalizeQuestionOptions = (
  type: "text" | "number" | "boolean" | "select",
  options?: string[]
) => {
  if (type !== "select") {
    return undefined;
  }
  const cleaned = (options ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (cleaned.length === 0) {
    throw new ConvexError("Select questions must include options");
  }
  return cleaned;
};

const getTemplate = async (
  ctx: QueryCtx | MutationCtx,
  templateId: Id<"auditTemplates">
) => {
  const template = await ctx.db.get(templateId);
  if (!template) {
    throw new ConvexError("Template not found");
  }
  return template;
};

const requireDraftTemplate = async (
  ctx: MutationCtx,
  templateId: Id<"auditTemplates">
) => {
  const template = await ctx.db.get(templateId);
  if (!template) {
    throw new ConvexError("Template not found");
  }
  if (template.status !== "draft") {
    throw new ConvexError("Only draft templates can be edited");
  }
  return template;
};

export const listLatestPublished = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["auditor", "manager", "admin"]);
    const published = await ctx.db
      .query("auditTemplates")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    const byFamily = new Map<string, (typeof published)[number]>();
    for (const template of published) {
      const current = byFamily.get(template.templateFamilyId);
      if (!current || template.version > current.version) {
        byFamily.set(template.templateFamilyId, template);
      }
    }

    return [...byFamily.values()].sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    const templates = await ctx.db.query("auditTemplates").collect();
    return templates.sort((a, b) => {
      if (a.templateFamilyId === b.templateFamilyId) {
        return b.version - a.version;
      }
      return a.templateFamilyId.localeCompare(b.templateFamilyId);
    });
  },
});

export const getTemplateBuilder = query({
  args: {
    templateId: v.id("auditTemplates"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const template = await getTemplate(ctx, args.templateId);
    const sections = await ctx.db
      .query("auditTemplateSections")
      .withIndex("by_template_order", (q) => q.eq("templateId", args.templateId))
      .collect();
    const questions = await ctx.db
      .query("auditQuestions")
      .withIndex("by_template_order", (q) => q.eq("templateId", args.templateId))
      .collect();

    const questionsBySection = new Map<string, typeof questions>();
    for (const question of questions) {
      const key = question.sectionId;
      const group = questionsBySection.get(key) ?? [];
      group.push(question);
      questionsBySection.set(key, group);
    }

    return {
      template,
      sections: sections.map((section) => ({
        ...section,
        questions: (questionsBySection.get(section._id) ?? []).sort(
          (a, b) => a.order - b.order
        ),
      })),
    };
  },
});

export const createTemplate = mutation({
  args: {
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin"]);
    const now = Date.now();
    const id = await ctx.db.insert("auditTemplates", {
      templateFamilyId: crypto.randomUUID(),
      title: args.title.trim(),
      description: args.description.trim(),
      version: 1,
      status: "draft",
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const createTemplateVersion = mutation({
  args: {
    templateId: v.id("auditTemplates"),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin"]);
    const source = await getTemplate(ctx, args.templateId);
    const latest = await ctx.db
      .query("auditTemplates")
      .withIndex("by_family_version", (q) =>
        q.eq("templateFamilyId", source.templateFamilyId)
      )
      .order("desc")
      .first();

    const now = Date.now();
    const newTemplateId = await ctx.db.insert("auditTemplates", {
      templateFamilyId: source.templateFamilyId,
      title: source.title,
      description: source.description,
      version: (latest?.version ?? source.version) + 1,
      status: "draft",
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    const sourceSections = await ctx.db
      .query("auditTemplateSections")
      .withIndex("by_template_order", (q) => q.eq("templateId", source._id))
      .collect();
    const sourceQuestions = await ctx.db
      .query("auditQuestions")
      .withIndex("by_template_order", (q) => q.eq("templateId", source._id))
      .collect();

    const sectionIdMap = new Map<string, Id<"auditTemplateSections">>();
    for (const section of sourceSections) {
      const newSectionId = await ctx.db.insert("auditTemplateSections", {
        templateId: newTemplateId,
        title: section.title,
        order: section.order,
      });
      sectionIdMap.set(section._id, newSectionId);
    }

    for (const question of sourceQuestions) {
      const newSectionId = sectionIdMap.get(question.sectionId);
      if (!newSectionId) {
        throw new ConvexError("Question section mapping failed");
      }
      await ctx.db.insert("auditQuestions", {
        templateId: newTemplateId,
        sectionId: newSectionId,
        questionText: question.questionText,
        type: question.type,
        options: question.options,
        required: question.required,
        order: question.order,
      });
    }

    return newTemplateId;
  },
});

export const updateTemplateMeta = mutation({
  args: {
    templateId: v.id("auditTemplates"),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await requireDraftTemplate(ctx, args.templateId);
    await ctx.db.patch(args.templateId, {
      title: args.title.trim(),
      description: args.description.trim(),
      updatedAt: Date.now(),
    });
    return (await ctx.db.get(args.templateId))!;
  },
});

export const saveTemplateStructure = mutation({
  args: {
    templateId: v.id("auditTemplates"),
    sections: v.array(
      v.object({
        title: v.string(),
        order: v.number(),
        questions: v.array(
          v.object({
            questionText: v.string(),
            type: questionTypeValidator,
            options: v.optional(v.array(v.string())),
            required: v.boolean(),
            order: v.number(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await requireDraftTemplate(ctx, args.templateId);

    const existingQuestions = await ctx.db
      .query("auditQuestions")
      .withIndex("by_template_order", (q) => q.eq("templateId", args.templateId))
      .collect();
    for (const question of existingQuestions) {
      await ctx.db.delete(question._id);
    }

    const existingSections = await ctx.db
      .query("auditTemplateSections")
      .withIndex("by_template_order", (q) => q.eq("templateId", args.templateId))
      .collect();
    for (const section of existingSections) {
      await ctx.db.delete(section._id);
    }

    const orderedSections = [...args.sections].sort((a, b) => a.order - b.order);
    for (const [sectionIndex, section] of orderedSections.entries()) {
      const sectionId = await ctx.db.insert("auditTemplateSections", {
        templateId: args.templateId,
        title: section.title.trim(),
        order: sectionIndex,
      });
      const orderedQuestions = [...section.questions].sort(
        (a, b) => a.order - b.order
      );
      for (const [questionIndex, question] of orderedQuestions.entries()) {
        await ctx.db.insert("auditQuestions", {
          templateId: args.templateId,
          sectionId,
          questionText: question.questionText.trim(),
          type: question.type,
          options: normalizeQuestionOptions(question.type, question.options),
          required: question.required,
          order: questionIndex,
        });
      }
    }

    await ctx.db.patch(args.templateId, { updatedAt: Date.now() });
    return (await ctx.db.get(args.templateId))!;
  },
});

export const publishTemplate = mutation({
  args: {
    templateId: v.id("auditTemplates"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await requireDraftTemplate(ctx, args.templateId);
    const hasQuestion =
      (
        await ctx.db
          .query("auditQuestions")
          .withIndex("by_template_order", (q) =>
            q.eq("templateId", args.templateId)
          )
          .take(1)
      ).length > 0;

    if (!hasQuestion) {
      throw new ConvexError("Template must include at least one question");
    }

    const now = Date.now();
    await ctx.db.patch(args.templateId, {
      status: "published",
      publishedAt: now,
      updatedAt: now,
    });
    return (await ctx.db.get(args.templateId))!;
  },
});
