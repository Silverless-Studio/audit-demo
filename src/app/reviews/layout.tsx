import { AuthGate } from "@/components/app/auth-gate";

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
