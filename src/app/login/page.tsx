import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";
import { LoginForm } from "@/components/app/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  if (await isAuthenticated()) {
    redirect("/dashboard");
  }
  const params = await searchParams;
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <LoginForm redirectTo={params.redirectTo} googleEnabled={googleEnabled} />
    </div>
  );
}
