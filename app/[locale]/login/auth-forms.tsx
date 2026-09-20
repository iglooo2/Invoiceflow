"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  loginWithGithub,
  loginWithGoogle,
  loginWithMagicLink,
  loginWithPassword,
  loginWithPhone,
  registerWithPassword,
  requestPhoneOtp,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import type { Dictionary } from "@/lib/dictionary";
import { formatMessage } from "@/lib/i18n";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY_ISO } from "@/lib/onboarding";

export function AuthForms({
  githubEnabled,
  googleEnabled = false,
  smsEnabled = false,
  magicEnabled,
  callbackUrl,
  showDemoCredentials,
  initialMode = "signin",
  copy,
  initialError,
}: {
  githubEnabled: boolean;
  googleEnabled?: boolean;
  smsEnabled?: boolean;
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
        <PhoneAuthPanel enabled={smsEnabled} copy={copy} callbackUrl={callbackUrl} onError={setError} />
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

function PhoneAuthPanel({
  enabled,
  copy,
  callbackUrl,
  onError,
}: {
  enabled: boolean;
  copy: Dictionary["login"];
  callbackUrl: string;
  onError: (message: string | null) => void;
}) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [country, setCountry] = useState(DEFAULT_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [code, setCode] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);
  const [pending, setPending] = useState(false);
  const hintId = "phone-sms-hint";

  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = window.setTimeout(() => setRetryAfter((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [retryAfter]);

  if (!enabled) {
    return (
      <div data-phone-auth="false">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center disabled:opacity-70"
          disabled
          aria-describedby={hintId}
        >
          <PhoneMark />
          {copy.phone}
        </Button>
        <p id={hintId} className="mt-2 text-xs text-muted-foreground">
          {copy.phoneHint}
        </p>
      </div>
    );
  }

  async function sendCode() {
    onError(null);
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("countryIso", country);
      formData.set("nationalNumber", national);
      const result = await requestPhoneOtp(formData);
      if (result?.error) {
        onError(result.error);
        if (result.retryAfterSeconds) setRetryAfter(result.retryAfterSeconds);
        return;
      }
      setStep("code");
      setCode("");
      setRetryAfter(result.retryAfterSeconds ?? 45);
    } finally {
      setPending(false);
    }
  }

  if (step === "code") {
    return (
      <form
        className="grid gap-3 rounded-2xl border border-border bg-background/40 p-4"
        data-phone-auth="true"
        data-phone-step="code"
        action={async (formData) => {
          onError(null);
          const result = await loginWithPhone(formData);
          if (result?.error) onError(result.error);
        }}
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <input type="hidden" name="countryIso" value={country} />
        <input type="hidden" name="nationalNumber" value={national} />
        <p className="text-sm text-muted-foreground">{copy.codeSent}</p>
        <p className="text-xs text-muted-foreground">{copy.codeGate}</p>
        <div className="grid gap-2">
          <Label htmlFor="sms-code">{copy.codeLabel}</Label>
          <Input
            id="sms-code"
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            placeholder={copy.codePlaceholder}
          />
        </div>
        <Button type="submit" className="w-full">
          {copy.verifyCode}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || retryAfter > 0}
            onClick={() => void sendCode()}
          >
            {retryAfter > 0 ? formatMessage(copy.resendIn, { seconds: retryAfter }) : copy.resendCode}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setStep("phone");
              setCode("");
              onError(null);
            }}
          >
            {copy.changePhone}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      className="grid gap-3 rounded-2xl border border-border bg-background/40 p-4"
      data-phone-auth="true"
      data-phone-step="phone"
      action={async () => {
        await sendCode();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[9.5rem_1fr]">
        <div className="grid gap-2">
          <Label htmlFor="phone-country">{copy.phoneCountry}</Label>
          <Select
            id="phone-country"
            name="countryIso"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            {COUNTRY_OPTIONS.map((item) => (
              <option key={item.iso} value={item.iso}>
                {item.flag} {item.dial}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone-national">{copy.phoneNumber}</Label>
          <Input
            id="phone-national"
            name="nationalNumber"
            value={national}
            onChange={(event) => setNational(event.target.value)}
            inputMode="tel"
            autoComplete="tel-national"
            required
          />
        </div>
      </div>
      <Button type="submit" variant="outline" className="w-full justify-center" disabled={pending}>
        <PhoneMark />
        {copy.phone}
      </Button>
    </form>
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

function PhoneMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.7 3.8c.4-.4 1-.5 1.5-.3l2.2.9c.6.2 1 .8 1 1.4v2.1c0 .4-.2.8-.5 1.1l-1.2 1.2a12.4 12.4 0 0 0 5.6 5.6l1.2-1.2c.3-.3.7-.5 1.1-.5h2.1c.6 0 1.2.4 1.4 1l.9 2.2c.2.5.1 1.1-.3 1.5l-1.5 1.5c-.4.4-1 .6-1.6.5C11.6 21.2 2.8 12.4 3.2 5.9c0-.6.2-1.2.5-1.6Z"
      />
    </svg>
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
