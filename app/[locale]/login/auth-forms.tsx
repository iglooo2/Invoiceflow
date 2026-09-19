"use client";

import { useState } from "react";
import { loginWithGithub, loginWithMagicLink, loginWithPassword, registerWithPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Dictionary } from "@/lib/dictionary";

export function AuthForms({
  githubEnabled,
  magicEnabled,
  callbackUrl,
  showDemoCredentials,
  copy,
}: {
  githubEnabled: boolean;
  magicEnabled: boolean;
  callbackUrl: string;
  showDemoCredentials: boolean;
  copy: Dictionary["login"];
}) {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="paper-card rounded-3xl p-6 md:p-8">
      <div className="mb-6 flex gap-2">
        <Button type="button" variant={mode === "signin" ? "default" : "ghost"} onClick={() => setMode("signin")}>
          {copy.signIn}
        </Button>
        <Button type="button" variant={mode === "register" ? "default" : "ghost"} onClick={() => setMode("register")}>
          {copy.createAccount}
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
            <Label htmlFor="name">{copy.name}</Label>
            <Input id="name" name="name" required placeholder="Maya Chen" />
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="email">{copy.email}</Label>
          <Input id="email" name="email" type="email" required placeholder="you@studio.com" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">{copy.password}</Label>
          <Input id="password" name="password" type="password" required minLength={8} />
        </div>
        <Button type="submit">{mode === "register" ? copy.createAccount : copy.signIn}</Button>
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
          <Label htmlFor="magic-email">{copy.magicLabel}</Label>
          <Input id="magic-email" name="email" type="email" placeholder="you@studio.com" required />
          <Button type="submit" variant="outline">
            {copy.sendMagic}
          </Button>
        </form>
      ) : null}

      {githubEnabled ? (
        <form className="mt-4" action={loginWithGithub}>
          <Button type="submit" variant="secondary" className="w-full">
            {copy.github}
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          {copy.githubHint}
        </p>
      )}

      {showDemoCredentials ? (
        <p className="mt-6 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {copy.demoPrefix} <span className="text-foreground">demo@invoiceflow.dev</span> /{" "}
          <span className="text-foreground">demo1234</span>
        </p>
      ) : null}
    </div>
  );
}
