import Link from "next/link";
import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/domain";
import { requireSessionUser } from "@/lib/server-auth";
import { SignOutButton } from "@/components/app/sign-out-button";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireSessionUser();
  const links: Array<{ href: string; label: string }> = [{ href: "/dashboard", label: "Dashboard" }];

  if (user.role === "auditor" || user.role === "admin") {
    links.push({ href: "/audits", label: "Audits" });
  }
  if (user.role === "manager" || user.role === "admin") {
    links.push({ href: "/reviews", label: "Reviews" });
  }
  if (user.role === "admin") {
    links.push({ href: "/admin", label: "Admin" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold">
              Audit Platform
            </Link>
            <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground text-xs font-medium"
              >
                {link.label}
              </Link>
            ))}
            <Separator orientation="vertical" className="mx-1 h-4" />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
