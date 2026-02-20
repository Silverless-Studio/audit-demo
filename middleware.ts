import { NextRequest, NextResponse } from "next/server";
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/audits",
  "/reviews",
  "/admin",
];

const isProtectedPath = (pathname: string) => {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
};

const shouldSkip = (pathname: string) => {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico"
  );
};

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }
  const hasAuthCookie =
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token");

  if (!hasAuthCookie && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    const redirectTo = `${pathname}${search}`;
    loginUrl.searchParams.set("redirectTo", redirectTo);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
