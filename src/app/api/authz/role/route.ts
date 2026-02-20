import { api } from "../../../../../convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { betterFetch } from "@better-fetch/fetch";
import { NextRequest, NextResponse } from "next/server";
import { AuthSession } from "@/lib/auth-client";

export async function GET(request: NextRequest) {
  const { data: session } = await betterFetch<AuthSession>("/api/auth/get-session", {
    baseURL: request.nextUrl.origin,
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      origin: request.nextUrl.origin,
    },
  });

  if (!session?.user?.email) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const role = await fetchQuery(api.users.getRoleByEmail, {
    email: session.user.email,
  });

  return NextResponse.json({ role });
}

