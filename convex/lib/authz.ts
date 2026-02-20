import { ConvexError } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";
import { AppRole } from "../domain";

type AuthCtx = QueryCtx | MutationCtx;

export const hasRole = (role: AppRole, allowed: readonly AppRole[]) => {
  return allowed.includes(role);
};

export const getUserByAuthUserId = async (ctx: AuthCtx, authUserId: string) => {
  return ctx.db
    .query("users")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
    .unique();
};

export const requireAuthUser = async (ctx: AuthCtx) => {
  return authComponent.getAuthUser(ctx);
};

export const requireAppUser = async (ctx: AuthCtx) => {
  const authUser = await requireAuthUser(ctx);
  const user = await getUserByAuthUserId(ctx, authUser._id);
  if (!user) {
    throw new ConvexError("User profile not provisioned");
  }
  return user;
};

export const requireRole = async (
  ctx: AuthCtx,
  allowed: readonly AppRole[]
): Promise<Doc<"users">> => {
  const user = await requireAppUser(ctx);
  if (!hasRole(user.role, allowed)) {
    throw new ConvexError("Forbidden");
  }
  return user;
};
