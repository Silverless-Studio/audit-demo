import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireRole, requireViewer } from "./auth";

export const syncUserCreation = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    authUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name?.trim() || existing.name,
        authUserId: args.authUserId ?? existing.authUserId,
      });
      return existing._id;
    }

    return ctx.db.insert("users", {
      email: args.email,
      name: args.name?.trim() || args.email,
      role: "auditor",
      createdAt: Date.now(),
      authUserId: args.authUserId,
    });
  },
});

export const syncUserDeletion = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const appUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!appUser) {
      return;
    }

    const hasAudits = await ctx.db
      .query("audits")
      .withIndex("auditorId_startedAt", (q) => q.eq("auditorId", appUser._id))
      .first();

    const managedAudits = await ctx.db
      .query("audits")
      .withIndex("managerId_startedAt", (q) => q.eq("managerId", appUser._id))
      .first();

    if (hasAudits || managedAudits) {
      return;
    }

    await ctx.db.delete(appUser._id);
  },
});

export const getRoleByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    return user?.role ?? "auditor";
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    requireRole(viewer, "admin");

    const users = await ctx.db.query("users").collect();
    return users
      .map((user) => ({
        ...user,
        name: user.name ?? user.email,
        role: user.role ?? "auditor",
        createdAt: user.createdAt ?? user._creationTime,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const changeUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("auditor"), v.literal("manager"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    requireRole(viewer, "admin");

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new Error("User not found");
    }

    await ctx.db.patch(target._id, {
      role: args.role,
    });

    return { ok: true };
  },
});

