import {
  anonymousClient,
  emailOTPClient,
  genericOAuthClient,
  magicLinkClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import type { authWithoutCtx } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [
    anonymousClient(),
    magicLinkClient(),
    emailOTPClient(),
    twoFactorClient(),
    genericOAuthClient(),
    convexClient(),
  ],
});

export type AuthSession = typeof authWithoutCtx["$Infer"]["Session"];
