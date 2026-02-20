import { ConvexError, v } from "convex/values";
import { authComponent } from "./auth";
import { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { appRoleValidator } from "./domain";
import { requireRole } from "./lib/authz";

const sortByCreatedAtDesc = (users: Doc<"users">[]) => {
  return users.sort((a, b) => b.createdAt - a.createdAt);
};

export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();

    if (existing) {
      const nextName = authUser.name ?? existing.name;
      const nextEmail = authUser.email ?? existing.email;
      if (nextName !== existing.name || nextEmail !== existing.email) {
        await ctx.db.patch(existing._id, {
          name: nextName,
          email: nextEmail,
          updatedAt: now,
        });
      }
      return (await ctx.db.get(existing._id))!;
    }

    const hasAnyUsers = (await ctx.db.query("users").take(1)).length > 0;
    const id = await ctx.db.insert("users", {
      authUserId: authUser._id,
      name: authUser.name ?? authUser.email ?? "Unknown User",
      email: authUser.email ?? "",
      role: hasAnyUsers ? "auditor" : "admin",
      createdAt: now,
      updatedAt: now,
    });
    return (await ctx.db.get(id))!;
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    return ctx.db
      .query("users")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    const users = await ctx.db.query("users").collect();
    return sortByCreatedAtDesc(users);
  },
});

export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: appRoleValidator,
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new ConvexError("User not found");
    }

    if (target.role === "admin" && args.role !== "admin") {
      const adminUsers = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .collect();
      if (adminUsers.length <= 1) {
        throw new ConvexError("At least one admin is required");
      }
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });
    return (await ctx.db.get(args.userId))!;
  },
});

export const getByIdForAudit = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<Pick<Doc<"users">, "_id" | "name" | "email" | "role"> | null> => {
    const viewer = await requireRole(ctx, ["auditor", "manager", "admin"]);
    if (viewer.role === "auditor" && viewer._id !== args.userId) {
      throw new ConvexError("Forbidden");
    }
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }
    return {
      _id: user._id as Id<"users">,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  },
});
