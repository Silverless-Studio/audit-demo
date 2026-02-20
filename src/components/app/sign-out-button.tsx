"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSignOut = async () => {
    setIsSubmitting(true);
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isSubmitting}
      onClick={onSignOut}
    >
      {isSubmitting ? "Signing out..." : "Sign out"}
    </Button>
  );
}
