import { betterFetch } from "@better-fetch/fetch";
import { NextRequest, NextResponse } from "next/server";
import { AuthSession } from "@/lib/auth-client";

const publicRoutes = ["/login"];

const routeRoleRequirements: Array<{
  prefix: string;
  roles: Array<"auditor" | "manager" | "admin">;
}> = [
  {
    prefix: "/audits",
    roles: ["auditor", "admin"],
  },
  {
    prefix: "/reviews",
    roles: ["manager", "admin"],
  },
  {
    prefix: "/admin",
    roles: ["admin"],
  },
];

const getSession = async (request: NextRequest) => {
  const { data: session } = await betterFetch<AuthSession>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        origin: request.nextUrl.origin,
      },
    },
  );

  return session;
};

const getRole = async (request: NextRequest) => {
  const response = await fetch(`${request.nextUrl.origin}/api/authz/role`, {
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      origin: request.nextUrl.origin,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    role: "auditor" | "manager" | "admin" | null;
  };

  return data.role;
};

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  const session = await getSession(request);
  if (!session) {
    if (isPublicRoute) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/" || isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const matchedRequirement = routeRoleRequirements.find((requirement) =>
    pathname.startsWith(requirement.prefix),
  );

  if (!matchedRequirement) {
    return NextResponse.next();
  }

  const role = await getRole(request);
  if (!role || !matchedRequirement.roles.includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
