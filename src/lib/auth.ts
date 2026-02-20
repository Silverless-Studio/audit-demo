import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth, BetterAuthOptions } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { betterAuthComponent } from "../../convex/auth";
import { requireMutationCtx } from "@convex-dev/better-auth/utils";
import {
  QueryCtx,
  MutationCtx,
  ActionCtx,
} from "../../convex/_generated/server";
import { internal } from "../../convex/_generated/api";
import {
  sendEmailVerification,
  sendResetPassword,
} from "../../convex/email";

type GenericCtx = QueryCtx | MutationCtx | ActionCtx;

const siteUrl = process.env.SITE_URL;
if (!siteUrl) {
  throw new Error("SITE_URL environment variable is required");
}

const createOptions = (ctx: GenericCtx) =>
  ({
    baseURL: siteUrl,
    database: betterAuthComponent.adapter(ctx as any),
    secret: process.env.BETTER_AUTH_SECRET,
    advanced: {
      disableCSRFCheck: false,
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmailVerification(requireMutationCtx(ctx) as any, {
          to: user.email,
          url,
        });
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        await sendResetPassword(requireMutationCtx(ctx) as any, {
          to: user.email,
          url,
        });
      },
    },
    socialProviders:
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
          }
        : undefined,
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    plugins: [twoFactor()],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if ("runMutation" in ctx) {
              await ctx.runMutation(internal.users.syncUserCreation, {
                email: user.email,
                name: user.name,
                authUserId: user.id,
              });
              return;
            }

            if ("db" in ctx) {
              const mutationCtx = ctx as MutationCtx;
              const existing = await mutationCtx.db
                .query("users")
                .withIndex("email", (q) => q.eq("email", user.email))
                .first();

              if (existing) {
                await mutationCtx.db.patch(existing._id, {
                  name: user.name || existing.name,
                  authUserId: user.id,
                });
                return;
              }

              await mutationCtx.db.insert("users", {
                email: user.email,
                name: user.name || user.email,
                role: "auditor",
                createdAt: Date.now(),
                authUserId: user.id,
              });
            }
          },
        },
        delete: {
          after: async (user) => {
            if ("runMutation" in ctx) {
              await ctx.runMutation(internal.users.syncUserDeletion, {
                email: user.email,
              });
              return;
            }

            if ("db" in ctx) {
              const mutationCtx = ctx as MutationCtx;
              const existing = await mutationCtx.db
                .query("users")
                .withIndex("email", (q) => q.eq("email", user.email))
                .first();

              if (!existing) {
                return;
              }

              const hasAudits = await mutationCtx.db
                .query("audits")
                .withIndex("auditorId_startedAt", (q) =>
                  q.eq("auditorId", existing._id),
                )
                .first();

              const hasManagedAudits = await mutationCtx.db
                .query("audits")
                .withIndex("managerId_startedAt", (q) =>
                  q.eq("managerId", existing._id),
                )
                .first();

              if (!hasAudits && !hasManagedAudits) {
                await mutationCtx.db.delete(existing._id);
              }
            }
          },
        },
      },
    },
  } satisfies BetterAuthOptions);

export const createAuth = (ctx: GenericCtx) => {
  const options = createOptions(ctx);
  return betterAuth({
    ...options,
    plugins: [...options.plugins, convex()],
  });
};

export const authWithoutCtx = createAuth({} as any);

