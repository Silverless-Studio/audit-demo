import { createClient } from "@convex-dev/better-auth";
import { components } from "./_generated/api";
import { DataModel, Doc } from "./_generated/dataModel";
import { query, QueryCtx, MutationCtx } from "./_generated/server";

export type UserRole = "auditor" | "manager" | "admin";

type ConvexCtx = QueryCtx | MutationCtx;

export const betterAuthComponent = createClient<DataModel>(
  components.betterAuth,
);

export type Viewer = {
  authUser: Awaited<ReturnType<typeof betterAuthComponent.getAuthUser>>;
  user: Doc<"users"> & {
    name: string;
    role: UserRole;
    createdAt: number;
  };
};

const roleRank: Record<UserRole, number> = {
  auditor: 1,
  manager: 2,
  admin: 3,
};

export const hasAtLeastRole = (actual: UserRole, minimum: UserRole) => {
  return roleRank[actual] >= roleRank[minimum];
};

const getUserByEmail = async (ctx: ConvexCtx, email: string) => {
  return ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();
};

const normalizeUser = (user: Doc<"users">) => ({
  ...user,
  name: user.name ?? user.email,
  role: user.role ?? "auditor",
  createdAt: user.createdAt ?? user._creationTime,
});

export const getViewer = async (ctx: ConvexCtx): Promise<Viewer | null> => {
  let authUser: Awaited<ReturnType<typeof betterAuthComponent.getAuthUser>>;
  try {
    authUser = await betterAuthComponent.getAuthUser(ctx);
  } catch {
    return null;
  }

  if (!authUser?.email) {
    return null;
  }

  const user = await getUserByEmail(ctx, authUser.email);
  if (!user) {
    return null;
  }

  return { authUser, user: normalizeUser(user) };
};

export const requireViewer = async (ctx: ConvexCtx): Promise<Viewer> => {
  const viewer = await getViewer(ctx);
  if (!viewer) {
    throw new Error("Unauthorized");
  }
  return viewer;
};

export const requireRole = (
  viewer: Viewer,
  minimumRole: UserRole,
  message = "Forbidden",
) => {
  if (!hasAtLeastRole(viewer.user.role, minimumRole)) {
    throw new Error(message);
  }
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    return {
      ...viewer.user,
      authName: viewer.authUser.name ?? null,
      authImage: viewer.authUser.image ?? null,
      authEmailVerified: viewer.authUser.emailVerified ?? false,
    };
  },
});

