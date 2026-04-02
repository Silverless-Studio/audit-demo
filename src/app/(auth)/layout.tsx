import { AuthGate } from "@/components/app/auth-gate";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
