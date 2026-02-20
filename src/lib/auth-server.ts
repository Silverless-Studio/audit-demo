import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { fetchAction, fetchMutation, fetchQuery, preloadQuery } from "convex/nextjs";
import type {
  ArgsAndOptions,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import type { Preloaded } from "convex/react";
import { headers } from "next/headers";
import type { EmptyObject } from "convex-helpers";

const auth = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});

export const { handler } = auth;

type AnyFunctionRef = FunctionReference<
  "query" | "mutation" | "action",
  "public" | "internal"
>;

type OptionalArgs<FuncRef extends AnyFunctionRef> =
  FuncRef["_args"] extends EmptyObject
    ? [args?: EmptyObject]
    : [args: FuncRef["_args"]];

const getArgsAndOptions = <FuncRef extends AnyFunctionRef>(
  args: OptionalArgs<FuncRef>,
  token?: string
): ArgsAndOptions<FuncRef, { token?: string }> => {
  return [args[0], { token }];
};

const resolveBaseUrl = async () => {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");

  if (host) {
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
};

export const getToken = async (): Promise<string | undefined> => {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");
  if (!cookie) {
    return undefined;
  }

  const baseUrl = await resolveBaseUrl();
  const response = await fetch(`${baseUrl}/api/auth/convex/token`, {
    method: "GET",
    headers: {
      cookie,
      origin: baseUrl,
      referer: `${baseUrl}/login`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return undefined;
  }

  const data = (await response.json()) as { token?: string };
  return data.token;
};

export const isAuthenticated = async () => {
  const token = await getToken();
  return Boolean(token);
};

export const preloadAuthQuery = async <Query extends FunctionReference<"query">>(
  query: Query,
  ...args: OptionalArgs<Query>
): Promise<Preloaded<Query>> => {
  const token = await getToken();
  const argsAndOptions = getArgsAndOptions(args, token);
  return preloadQuery(query, ...argsAndOptions);
};

export const fetchAuthQuery = async <Query extends FunctionReference<"query">>(
  query: Query,
  ...args: OptionalArgs<Query>
): Promise<FunctionReturnType<Query>> => {
  const token = await getToken();
  const argsAndOptions = getArgsAndOptions(args, token);
  return fetchQuery(query, ...argsAndOptions);
};

export const fetchAuthMutation = async <Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation,
  ...args: OptionalArgs<Mutation>
): Promise<FunctionReturnType<Mutation>> => {
  const token = await getToken();
  const argsAndOptions = getArgsAndOptions(args, token);
  return fetchMutation(mutation, ...argsAndOptions);
};

export const fetchAuthAction = async <Action extends FunctionReference<"action">>(
  action: Action,
  ...args: OptionalArgs<Action>
): Promise<FunctionReturnType<Action>> => {
  const token = await getToken();
  const argsAndOptions = getArgsAndOptions(args, token);
  return fetchAction(action, ...argsAndOptions);
};
