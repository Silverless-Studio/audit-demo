"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function LoginForm({
  redirectTo,
  googleEnabled,
}: {
  redirectTo?: string;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (mode === "sign-in") {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (result.error) {
          setError(result.error.message ?? "Sign in failed");
          return;
        }
      } else {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        if (result.error) {
          setError(result.error.message ?? "Sign up failed");
          return;
        }
      }

      router.push(redirectTo ?? "/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const destination =
        redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";
      const callbackURL = new URL(destination, window.location.origin).toString();
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
      if (result.error) {
        setError(result.error.message ?? "Google sign in failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {mode === "sign-in" ? "Sign in to Audit Platform" : "Create an account"}
        </CardTitle>
        <CardDescription>
          Use email/password or Google. First registered user becomes admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {googleEnabled ? (
          <div className="mb-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onGoogleSignIn}
              className="w-full justify-center"
            >
              Continue with Google
            </Button>
          </div>
        ) : null}
        <form onSubmit={onSubmit}>
          <FieldGroup>
            {mode === "sign-up" ? (
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </Field>
            {error ? (
              <FieldDescription className="text-destructive">{error}</FieldDescription>
            ) : null}
            <Field orientation="horizontal">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Please wait..."
                  : mode === "sign-in"
                    ? "Sign in"
                    : "Create account"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() =>
                  setMode((current) =>
                    current === "sign-in" ? "sign-up" : "sign-in"
                  )
                }
              >
                {mode === "sign-in" ? "Need an account?" : "Have an account?"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
