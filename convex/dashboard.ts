import { query } from "./_generated/server";
import { requireRole } from "./lib/authz";

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, ["auditor", "manager", "admin"]);

    if (user.role === "auditor") {
      const audits = await ctx.db
        .query("audits")
        .withIndex("by_auditor", (q) => q.eq("auditorId", user._id))
        .collect();
      return {
        role: user.role,
        totalAudits: audits.length,
        drafts: audits.filter((audit) => audit.status === "draft").length,
        submitted: audits.filter((audit) => audit.status === "submitted").length,
        signedOff: audits.filter((audit) => audit.status === "signed_off").length,
      };
    }

    if (user.role === "manager") {
      const [submitted, approved, signedOff] = await Promise.all([
        ctx.db
          .query("audits")
          .withIndex("by_status", (q) => q.eq("status", "submitted"))
          .collect(),
        ctx.db
          .query("audits")
          .withIndex("by_status", (q) => q.eq("status", "approved"))
          .collect(),
        ctx.db
          .query("audits")
          .withIndex("by_status", (q) => q.eq("status", "signed_off"))
          .collect(),
      ]);
      return {
        role: user.role,
        submitted: submitted.length,
        approved: approved.length,
        signedOff: signedOff.length,
      };
    }

    const [users, audits, templates] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("audits").collect(),
      ctx.db.query("auditTemplates").collect(),
    ]);

    return {
      role: user.role,
      users: users.length,
      admins: users.filter((account) => account.role === "admin").length,
      managers: users.filter((account) => account.role === "manager").length,
      auditors: users.filter((account) => account.role === "auditor").length,
      templates: templates.length,
      publishedTemplates: templates.filter((template) => template.status === "published")
        .length,
      audits: audits.length,
      submittedAudits: audits.filter((audit) => audit.status === "submitted").length,
    };
  },
});
