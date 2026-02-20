import { redirect } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { AppRole } from "@/lib/domain";
import { fetchAuthMutation, fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";

export async function requireSessionUser(allowedRoles?: readonly AppRole[]) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  try {
    await fetchAuthMutation(api.users.ensureCurrentUser, {});
    const user = await fetchAuthQuery(api.users.current, {});
    if (!user) {
      redirect("/login");
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      redirect("/dashboard");
    }
    return user;
  } catch {
    redirect("/login");
  }
}
