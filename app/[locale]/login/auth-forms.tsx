"use client";

import { useState, type ReactNode } from "react";
import {
  loginWithGithub,
  loginWithGoogle,
  loginWithMagicLink,
  loginWithPassword,
  registerWithPassword,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Dictionary } from "@/lib/dictionary";

export function AuthForms({
  githubEnabled,
  googleEnabled = false,
  magicEnabled,
  callbackUrl,
  showDemoCredentials,
  initialMode = "signin",
  copy,
  initialError,
}: {
  githubEnabled: boolean;
  googleEnabled?: boolean;
  magicEnabled: boolean;
  callbackUrl: string;
  showDemoCredentials: boolean;
  initialMode?: "signin" | "register";
  copy: Dictionary["login"];
  initialError?: string | null;
}) {
  const [mode, setMode] = useState<"signin" | "register">(initialMode);
  const [error, setError] = useState<string | null>(initialError ?? null);

  return (
    <div className="paper-card rounded-3xl p-6 md:p-8">
      <div className="mb-6 flex flex-wrap gap-1.5">
        <Button type="button" variant={mode === "signin" ? "default" : "ghost"} onClick={() => setMode("signin")}>
          {copy.signIn}
        </Button>
        <Button type="button" variant={mode === "register" ? "default" : "ghost"} onClick={() => setMode("register")}>
          {copy.createAccount}
        </Button>
      </div>
      {error ? (
        <p className="mb-4 text-sm text-destructive" role="alert" data-testid="auth-error">
          {error}
        </p>
      ) : null}

      {/* Google always mounts on sign-in and register. `enabled` only toggles click vs hint. */}
      <div className="grid gap-3">
        <OauthButton
          enabled={googleEnabled}
          provider="google"
          label={copy.google}
          hint={copy.googleHint}
          action={loginWithGoogle}
          onError={setError}
          icon={<GoogleMark />}
        />
        {githubEnabled ? (
          <form action={loginWithGithub}>
            <Button type="submit" variant="secondary" className="w-full">
              {copy.github}
            </Button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">{copy.githubHint}</p>
        )}
      </div>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {copy.orContinue}
        <span className="h-px flex-1 bg-border" />
      </div>

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

      {showDemoCredentials ? (
        <p className="mt-6 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {copy.demoPrefix} <span className="text-foreground">demo@invoiceflow.dev</span> /{" "}
          <span className="text-foreground">demo1234</span>
        </p>
      ) : null}
    </div>
  );
}

function OauthButton({
  enabled,
  provider,
  label,
  hint,
  action,
  onError,
  icon,
}: {
  enabled: boolean;
  provider: "google";
  label: string;
  hint: string;
  action: () => Promise<{ error?: string } | void>;
  onError: (message: string | null) => void;
  icon: ReactNode;
}) {
  const hintId = `${provider}-oauth-hint`;
  if (!enabled) {
    return (
      <div data-oauth={provider} data-oauth-enabled="false">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center disabled:opacity-70"
          disabled
          aria-describedby={hintId}
        >
          {icon}
          {label}
        </Button>
        <p id={hintId} className="mt-2 text-xs text-muted-foreground">
          {hint}
        </p>
      </div>
    );
  }

  return (
    <form
      data-oauth={provider}
      data-oauth-enabled="true"
      action={async () => {
        onError(null);
        const result = await action();
        if (result?.error) onError(result.error);
      }}
    >
      <Button type="submit" variant="outline" className="w-full justify-center">
        {icon}
        {label}
      </Button>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.85-.08-1.67-.22-2.46H12v4.66h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.88l-3.88-3c-1.08.72-2.47 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.32A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.37-2.32V6.57H1.27A12 12 0 0 0 0 12c0 1.94.46 3.78 1.27 5.43l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.16 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.57l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
