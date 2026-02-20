import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";

export default async function Page() {
  if (await isAuthenticated()) {
    redirect("/dashboard");
  }
  redirect("/login");
}
