"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "login") {
      await authClient.signIn.email(
        { email, password },
        {
          onSuccess: () => {
            router.push("/dashboard");
          },
          onError: (ctx) => {
            setError(ctx.error.message);
            setLoading(false);
          },
        },
      );
      return;
    }

    await authClient.signUp.email(
      {
        name: name.trim(),
        email,
        password,
      },
      {
        onSuccess: () => {
          router.push("/dashboard");
        },
        onError: (ctx) => {
          setError(ctx.error.message);
          setLoading(false);
        },
      },
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === "login" ? "Login" : "Create account"}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Sign in to the engagement platform."
              : "Create your account. New users default to auditor role."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            {mode === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => {
              setError(null);
              setLoading(false);
              setMode((prev) => (prev === "login" ? "signup" : "login"));
            }}
          >
            {mode === "login"
              ? "Need an account? Sign up"
              : "Have an account? Log in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

