"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { saveOnboardingBusiness, saveOnboardingProfile } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/dictionary";
import {
  COUNTRY_OPTIONS,
  EMPLOYEE_COUNT_KEYS,
  INDUSTRY_KEYS,
  composePhone,
  isValidPhone,
} from "@/lib/onboarding";
import { localizedPath, type Locale } from "@/lib/i18n";

function StudioField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="block rounded-2xl border border-border bg-background/40 px-4 pb-2.5 pt-2 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25"
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

const fieldControlClass =
  "w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70";

export function ProfileOnboardingForm({
  locale,
  copy,
  nav,
  firstName,
  lastName,
  countryIso,
  nationalNumber,
}: {
  locale: Locale;
  copy: Dictionary["onboarding"];
  nav: Dictionary["nav"];
  firstName: string;
  lastName: string;
  countryIso: string;
  nationalNumber: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [first, setFirst] = useState(firstName);
  const [phone, setPhone] = useState(nationalNumber);
  const [country, setCountry] = useState(countryIso);
  const [consent, setConsent] = useState(false);

  const ready = useMemo(() => {
    return Boolean(first.trim() && isValidPhone(composePhone(country, phone)) && consent);
  }, [first, phone, country, consent]);

  return (
    <form
      className="paper-card mx-auto w-full max-w-xl rounded-[2rem] p-6 md:p-8"
      action={async (formData) => {
        setError(null);
        const result = await saveOnboardingProfile(formData);
        if (result?.error) setError(result.error);
      }}
    >
      <div className="grid gap-5">
        <StudioField id="firstName" label={copy.firstName}>
          <input
            id="firstName"
            name="firstName"
            value={first}
            onChange={(event) => setFirst(event.target.value)}
            required
            autoComplete="given-name"
            className={fieldControlClass}
          />
        </StudioField>
        <StudioField id="lastName" label={copy.lastName}>
          <input
            id="lastName"
            name="lastName"
            defaultValue={lastName}
            autoComplete="family-name"
            className={fieldControlClass}
          />
        </StudioField>
        <div className="grid gap-5 sm:grid-cols-[9.5rem_1fr]">
          <StudioField id="countryIso" label={copy.country}>
            <select
              id="countryIso"
              name="countryIso"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className={`${fieldControlClass} cursor-pointer`}
            >
              {COUNTRY_OPTIONS.map((item) => (
                <option key={item.iso} value={item.iso}>
                  {item.flag} {item.dial}
                </option>
              ))}
            </select>
          </StudioField>
          <StudioField id="nationalNumber" label={copy.phone}>
            <input
              id="nationalNumber"
              name="nationalNumber"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              autoComplete="tel-national"
              required
              className={fieldControlClass}
            />
          </StudioField>
        </div>
      </div>

      <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-muted-foreground">
        <input
          type="checkbox"
          name="consent"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border accent-accent"
        />
        <span>
          {copy.consentPrefix}{" "}
          <Link href={localizedPath(locale, "/terms")} className="font-medium text-foreground underline underline-offset-4">
            {nav.terms}
          </Link>{" "}
          {copy.consentAnd}{" "}
          <Link href={localizedPath(locale, "/privacy")} className="font-medium text-foreground underline underline-offset-4">
            {nav.privacy}
          </Link>
          .
        </span>
      </label>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <div className="mt-8 flex justify-center">
        <Button type="submit" size="lg" disabled={!ready}>
          {copy.saveContinue}
        </Button>
      </div>
    </form>
  );
}

export function BusinessOnboardingForm({
  locale,
  copy,
  businessName,
  employeeCount,
  industry,
}: {
  locale: Locale;
  copy: Dictionary["onboarding"];
  businessName: string;
  employeeCount: string;
  industry: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(businessName);
  const [employees, setEmployees] = useState(employeeCount);
  const [sector, setSector] = useState(industry);

  const ready = Boolean(name.trim() && employees && sector);

  return (
    <form
      className="paper-card mx-auto w-full max-w-xl rounded-[2rem] p-6 md:p-8"
      action={async (formData) => {
        setError(null);
        const result = await saveOnboardingBusiness(formData);
        if (result?.error) setError(result.error);
      }}
    >
      <div className="grid gap-5">
        <StudioField id="businessName" label={copy.businessName}>
          <input
            id="businessName"
            name="businessName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="organization"
            className={fieldControlClass}
          />
        </StudioField>
        <StudioField id="employeeCount" label={copy.employeeCount}>
          <select
            id="employeeCount"
            name="employeeCount"
            value={employees}
            onChange={(event) => setEmployees(event.target.value)}
            required
            className={`${fieldControlClass} cursor-pointer`}
          >
            <option value="">{copy.employeeCount}</option>
            {EMPLOYEE_COUNT_KEYS.map((key) => (
              <option key={key} value={key}>
                {copy.employees[key]}
              </option>
            ))}
          </select>
        </StudioField>
        <StudioField id="industry" label={copy.industry}>
          <select
            id="industry"
            name="industry"
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            required
            className={`${fieldControlClass} cursor-pointer`}
          >
            <option value="">{copy.industry}</option>
            {INDUSTRY_KEYS.map((key) => (
              <option key={key} value={key}>
                {copy.industries[key]}
              </option>
            ))}
          </select>
        </StudioField>
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <div className="mt-8 flex justify-center">
        <Button type="submit" size="lg" disabled={!ready}>
          {copy.saveContinue}
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {copy.goBackHint}{" "}
        <Link
          href={`${localizedPath(locale, "/onboarding")}?edit=1`}
          className="font-medium text-accent underline underline-offset-4"
        >
          {copy.goBack}
        </Link>
      </p>
    </form>
  );
}
