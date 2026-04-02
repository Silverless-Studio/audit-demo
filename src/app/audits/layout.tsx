import { AuthGate } from "@/components/app/auth-gate";

export default function AuditsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
