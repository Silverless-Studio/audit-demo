import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth/minimal";
import authConfig from "./auth.config";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
if (!siteUrl) {
  throw new Error(
    "NEXT_PUBLIC_SITE_URL (or SITE_URL, or VERCEL_URL at runtime) must be defined"
  );
}
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const defined = (value: string | undefined | null): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const normalizeOrigin = (value: string) => {
  return value.replace(/\/+$/, "");
};

const staticTrustedOrigins = [
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.SITE_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter(defined).map(normalizeOrigin);

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins: (request) => {
      const dynamic = new Set<string>(staticTrustedOrigins);
      if (!request) {
        return [...dynamic];
      }
      const origin = request.headers.get("origin");
      if (origin) {
        dynamic.add(normalizeOrigin(origin));
      }
      const host =
        request.headers.get("x-forwarded-host") ?? request.headers.get("host");
      if (host) {
        const proto = request.headers.get("x-forwarded-proto") ?? "https";
        dynamic.add(normalizeOrigin(`${proto}://${host}`));
      }
      return [...dynamic];
    },
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders:
      googleClientId && googleClientSecret
        ? {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          }
        : undefined,
    plugins: [
      convex({ authConfig }),
    ],
  });
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});
