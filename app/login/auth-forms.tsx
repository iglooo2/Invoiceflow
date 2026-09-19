"use client";

import { useState } from "react";
import { loginWithGithub, loginWithMagicLink, loginWithPassword, registerWithPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function AuthForms({
  githubEnabled,
  magicEnabled,
  callbackUrl,
  showDemoCredentials,
  initialMode = "signin",
}: {
  githubEnabled: boolean;
  magicEnabled: boolean;
  callbackUrl: string;
  showDemoCredentials: boolean;
  initialMode?: "signin" | "register";
}) {
  const [mode, setMode] = useState<"signin" | "register">(initialMode);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="paper-card rounded-3xl p-6 md:p-8">
      <div className="mb-6 flex gap-2">
        <Button type="button" variant={mode === "signin" ? "default" : "ghost"} onClick={() => setMode("signin")}>
          Sign in
        </Button>
        <Button type="button" variant={mode === "register" ? "default" : "ghost"} onClick={() => setMode("register")}>
          Create account
        </Button>
      </div>
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <form
        className="grid gap-4"
        action={async (formData) => {
          setError(null);
          const result =
            mode === "register" ? await registerWithPassword(formData) : await loginWithPassword(formData);
          if (result?.error) setError(result.error);
        }}
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {mode === "register" ? (
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Maya Chen" />
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@studio.com" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required minLength={8} />
        </div>
        <Button type="submit">{mode === "register" ? "Create account" : "Sign in"}</Button>
      </form>

      {magicEnabled ? (
        <form
          className="mt-6 grid gap-3 border-t border-border pt-6"
          action={async (formData) => {
            setError(null);
            const result = await loginWithMagicLink(formData);
            if (result?.error) setError(result.error);
          }}
        >
          <Label htmlFor="magic-email">Or email a magic link</Label>
          <Input id="magic-email" name="email" type="email" placeholder="you@studio.com" required />
          <Button type="submit" variant="outline">
            Send magic link
          </Button>
        </form>
      ) : null}

      {githubEnabled ? (
        <form className="mt-4" action={loginWithGithub}>
          <Button type="submit" variant="secondary" className="w-full">
            Continue with GitHub
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          GitHub OAuth appears here when AUTH_GITHUB_ID and AUTH_GITHUB_SECRET are set.
        </p>
      )}

      {showDemoCredentials ? (
        <p className="mt-6 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          Demo: <span className="text-foreground">demo@invoiceflow.dev</span> /{" "}
          <span className="text-foreground">demo1234</span>
        </p>
      ) : null}
    </div>
  );
}
