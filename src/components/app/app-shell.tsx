"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const roleLinks: Record<"auditor" | "manager" | "admin", Array<{ href: string; label: string }>> = {
  auditor: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/audits", label: "My Engagements" },
    { href: "/audits/new", label: "Start Audit" },
  ],
  manager: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/reviews", label: "Completion" },
  ],
  admin: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/audits", label: "Engagements" },
    { href: "/reviews", label: "Completion" },
    { href: "/admin", label: "Admin" },
  ],
};

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const router = useRouter();
  const { isLoading: authLoading } = useConvexAuth();
  const user = useQuery(api.auth.getCurrentUser);
  const [signingOut, setSigningOut] = useState(false);

  const links = useMemo(() => {
    if (!user) {
      return [];
    }
    return roleLinks[user.role];
  }, [user]);

  const signOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onRequest: () => setSigningOut(true),
        onSuccess: () => {
          router.push("/login");
        },
        onError: () => setSigningOut(false),
      },
    });
  };

  if (authLoading || user === undefined) {
    return <div className="p-6 text-sm text-muted-foreground">Loading session...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-8">
        <h1 className="text-xl font-semibold">Profile setup required</h1>
        <p className="text-sm text-muted-foreground">
          Your authenticated session exists, but no app user profile was found. Sign out and log in again.
        </p>
        <div>
          <Button variant="outline" onClick={signOut} disabled={signingOut}>
            {signingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{user.name}</span>
              <span>•</span>
              <span>{user.email}</span>
              <Badge variant="secondary" className="capitalize">
                {user.role}
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={signOut} disabled={signingOut}>
            {signingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
        <nav className="mt-4 flex flex-wrap gap-2">
          {links.map((link) => (
            <Button asChild variant="ghost" size="sm" key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

