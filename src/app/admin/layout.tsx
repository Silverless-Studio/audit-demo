import { AuthGate } from "@/components/app/auth-gate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
