import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { getDictionary } from "./dictionary";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  formatMessage,
  localizedPath,
  matchLocale,
  negotiateLocale,
  parseAcceptLanguage,
  shouldSkipLocale,
  splitLocalePath,
} from "./i18n";
import { proxy } from "../proxy";

test("formatMessage fills dashboard copy templates", () => {
  assert.equal(
    formatMessage("{invoices}/{invoiceLimit} invoices", { invoices: 2, invoiceLimit: 3 }),
    "2/3 invoices",
  );
});

test("localizedPath prefixes marketing routes", () => {
  assert.equal(localizedPath("en", "/"), "/en");
  assert.equal(localizedPath("es", "/pricing"), "/es/pricing");
  assert.equal(localizedPath("es", "/estimates"), "/es/estimates");
  assert.equal(localizedPath("de", "/contact"), "/de/contact");
  assert.equal(localizedPath("fr", "/advertise"), "/fr/advertise");
  assert.equal(localizedPath("pt", "login"), "/pt/login");
});

test("splitLocalePath reads a locale prefix", () => {
  assert.deepEqual(splitLocalePath("/fr"), { locale: "fr", path: "/" });
  assert.deepEqual(splitLocalePath("/de/privacy"), { locale: "de", path: "/privacy" });
  assert.deepEqual(splitLocalePath("/pricing"), { locale: null, path: "/pricing" });
});

test("shouldSkipLocale leaves app, API, and share routes alone", () => {
  assert.equal(shouldSkipLocale("/dashboard"), true);
  assert.equal(shouldSkipLocale("/dashboard/invoices"), true);
  assert.equal(shouldSkipLocale("/api/auth/session"), true);
  assert.equal(shouldSkipLocale("/share/i/abc"), true);
  assert.equal(shouldSkipLocale("/r/AbC123_xyz"), true);
  assert.equal(shouldSkipLocale("/icon"), true);
  assert.equal(shouldSkipLocale("/pricing"), false);
  assert.equal(shouldSkipLocale("/estimates"), false);
  assert.equal(shouldSkipLocale("/contact"), false);
  assert.equal(shouldSkipLocale("/advertise"), false);
  assert.equal(shouldSkipLocale("/"), false);
  assert.equal(shouldSkipLocale("/es/login"), false);
});

test("negotiateLocale prefers a valid cookie, then Accept-Language", () => {
  assert.equal(negotiateLocale("fr-FR,fr;q=0.9,en;q=0.8", null), "fr");
  assert.equal(negotiateLocale("pt-BR,pt;q=0.8", "de"), "de");
  assert.equal(negotiateLocale("es-MX,es;q=0.9", ""), "es");
  assert.equal(negotiateLocale(null, "nope"), DEFAULT_LOCALE);
  assert.equal(matchLocale("pt-br"), "pt");
  assert.deepEqual(parseAcceptLanguage("de-DE,de;q=0.8,en;q=0.5").slice(0, 1), ["de-de"]);
});

test("every locale dictionary has the same keys as English", () => {
  const flatten = (value: unknown, prefix = ""): string[] => {
    if (Array.isArray(value)) {
      return value.flatMap((item, index) => flatten(item, `${prefix}[${index}]`));
    }
    if (value && typeof value === "object") {
      return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
        flatten(nested, prefix ? `${prefix}.${key}` : key),
      );
    }
    return [prefix];
  };

  const english = flatten(getDictionary("en"));
  for (const locale of LOCALES) {
    assert.deepEqual(flatten(getDictionary(locale)), english, locale);
  }
});

test("unprefixed login keeps Auth.js error codes after locale redirect", () => {
  const request = new NextRequest("http://localhost:3000/login?error=CredentialsSignin&mode=register");
  const response = proxy(request);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.pathname, "/en/login");
  assert.equal(location.searchParams.get("error"), "CredentialsSignin");
  assert.equal(location.searchParams.get("mode"), "register");
});

test("unprefixed login register CTA keeps mode after locale redirect", () => {
  const request = new NextRequest("http://localhost:3000/login?mode=register");
  const response = proxy(request);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.pathname, "/en/login");
  assert.equal(location.searchParams.get("mode"), "register");
});

test("unauthenticated dashboard redirects to the cookie locale login, not /en", () => {
  const request = new NextRequest("http://localhost:3000/dashboard", {
    headers: { cookie: `${LOCALE_COOKIE}=es` },
  });
  const response = proxy(request);
  const location = response.headers.get("location") ?? "";
  assert.equal(new URL(location).pathname, "/es/login");
  assert.equal(new URL(location).searchParams.get("callbackUrl"), "/dashboard");
  assert.match(response.headers.get("set-cookie") ?? "", /invoiceflow-locale=es/);
});

test("dashboard billing nav and page title display Subscription, not Billing", () => {
  const labels = {
    en: "Subscription",
    es: "Suscripción",
    fr: "Abonnement",
    de: "Abonnement",
    pt: "Assinatura",
  } as const;
  for (const locale of LOCALES) {
    const dict = getDictionary(locale);
    assert.equal(dict.app.billing, labels[locale], locale);
    assert.notEqual(dict.app.billing, "Billing", locale);
  }
  assert.equal(getDictionary("en").contact.topics.billing, "Billing");

  const layout = readFileSync(path.join(import.meta.dirname, "../app/dashboard/layout.tsx"), "utf8");
  const page = readFileSync(path.join(import.meta.dirname, "../app/dashboard/billing/page.tsx"), "utf8");
  assert.match(layout, /dict\.app\.billing/);
  assert.match(layout, /"\/dashboard\/billing"/);
  assert.match(page, /dict\.app\.billing/);
  assert.match(page, /<h1 className="font-display text-4xl">\{dict\.app\.billing\}<\/h1>/);
});

test("login and dashboard common errors exist in every locale", () => {
  for (const locale of LOCALES) {
    const dict = getDictionary(locale);
    assert.ok(dict.login.errors.invalidCredentials.length > 0, locale);
    assert.ok(dict.login.errors.oauthNotConfigured.length > 0, locale);
    assert.ok(dict.login.errors.configuration.length > 0, locale);
    assert.ok(dict.login.errors.signInIncomplete.length > 0, locale);
    assert.ok(dict.login.errors.oauthAccountNotLinked.length > 0, locale);
    assert.match(dict.login.errors.oauthAccountNotLinked, /email|e-mail|E-Mail|senha|contraseña|Passwort/i);
    assert.match(dict.login.errors.oauthAccountNotLinked, /link|vincular|lier|verknüpf/i);
    assert.equal(dict.login.errors.signInIncomplete.includes("Google"), false, locale);
    assert.equal(dict.login.errors.invalidCredentials.includes("Google"), false, locale);
    assert.ok(dict.login.errors.phoneCodeInvalid.length > 0, locale);
    assert.ok(dict.login.phone.length > 0, locale);
    assert.ok(dict.onboarding.errors.phone.length > 0, locale);
    assert.ok(dict.app.errors.invoiceNotFound.length > 0, locale);
    assert.ok(dict.app.errors.estimateNotFound.length > 0, locale);
    assert.ok(dict.app.errors.jobNotFound.length > 0, locale);
    assert.ok(dict.app.jobs.length > 0, locale);
    assert.ok(dict.app.jobList.emptyTitle.length > 0, locale);
    assert.ok(dict.app.jobForm.addClient.length > 0, locale);
    assert.ok(dict.app.errors.clientEmailRequired.length > 0, locale);
    assert.ok(dict.nav.estimates.length > 0, locale);
    assert.ok(dict.estimatesPage.headline.length > 0, locale);
    assert.ok(dict.app.status.approved.length > 0, locale);
    assert.ok(dict.app.status.pending.length > 0, locale);
    assert.ok(dict.app.markPending.length > 0, locale);
    assert.ok(dict.app.exportCsv.length > 0, locale);
    assert.ok(dict.meta.contactTitle.length > 0, locale);
    assert.ok(dict.meta.advertiseTitle.length > 0, locale);
    assert.ok(dict.contact.submit.length > 0, locale);
    assert.ok(dict.nav.advertise.length > 0, locale);
    assert.ok(dict.partner.label.length > 0, locale);
    assert.ok(dict.partner.sponsored.length > 0, locale);
    assert.ok(dict.advertise.headline.length > 0, locale);
    assert.ok(dict.advertise.contactCta.length > 0, locale);
    assert.match(dict.advertise.ratesBody, /50|150/);
    assert.equal(dict.advertise.contactBody.includes("@"), false, locale);
  }
});

test("language switcher is a compact dropdown, not a row of locale chips", () => {
  const source = readFileSync(
    path.join(import.meta.dirname, "../components/marketing/language-switcher.tsx"),
    "utf8",
  );
  assert.match(source, /DropdownMenu/);
  assert.match(source, /aria-label/);
  assert.match(source, /RadioGroup/);
  assert.match(source, /persist === "cookie"/);
  assert.equal(source.includes('flex flex-wrap items-center gap-2'), false);
});

test("localized landing keeps the studio gallery and register CTA", () => {
  const page = readFileSync(path.join(import.meta.dirname, "../app/[locale]/page.tsx"), "utf8");
  const login = readFileSync(path.join(import.meta.dirname, "../app/[locale]/login/page.tsx"), "utf8");
  const forms = readFileSync(path.join(import.meta.dirname, "../app/[locale]/login/auth-forms.tsx"), "utf8");
  assert.match(page, /StudioProduct/);
  assert.match(page, /landing-canvas/);
  assert.match(page, /startFreeHref/);
  assert.match(page, /PartnerSlot/);
  assert.match(page, /id="partner"/);
  assert.match(page, /hasSessionCookie/);
  assert.doesNotMatch(page, /getCurrentUser/);
  assert.doesNotMatch(page, /from "@\/lib\/session"/);

  const marketingPages = [
    "app/[locale]/page.tsx",
    "app/[locale]/advertise/page.tsx",
    "app/[locale]/pricing/page.tsx",
    "app/[locale]/contact/page.tsx",
    "app/[locale]/estimates/page.tsx",
    "app/[locale]/privacy/page.tsx",
    "app/[locale]/terms/page.tsx",
    "app/[locale]/referral-terms/page.tsx",
  ];
  for (const file of marketingPages) {
    const source = readFileSync(path.join(import.meta.dirname, "..", file), "utf8");
    assert.match(source, /hasSessionCookie/, file);
    assert.doesNotMatch(source, /from "@\/lib\/session"/, file);
    assert.doesNotMatch(source, /from "@\/lib\/auth"/, file);
  }
  assert.match(login, /hasSessionCookie/);
  assert.match(login, /getCurrentUser/);
  assert.match(login, /query\.mode === "register"/);
  assert.match(login, /loginQueryErrorMessage/);
  assert.doesNotMatch(login, /dict\.login\.errors\.oauthFailed/);
  assert.match(forms, /initialMode = "signin"/);
  assert.match(forms, /copy\.google/);
  assert.match(forms, /copy\.phone/);
  assert.doesNotMatch(forms, /copy\.apple/);
  const googleButtonAt = forms.indexOf('provider="google"');
  const emailFieldAt = forms.indexOf('htmlFor="email"');
  assert.ok(googleButtonAt > 0 && googleButtonAt < emailFieldAt, "oauth above email");
  for (const locale of LOCALES) {
    const dict = getDictionary(locale);
    assert.ok(dict.home.startCta.length > 0, locale);
    assert.ok(dict.home.openStudio.length > 0, locale);
    assert.match(dict.home.headline, /\n/);
    assert.ok(dict.login.google.length > 0, locale);
    assert.equal("apple" in dict.login, false, locale);
    assert.equal("appleHint" in dict.login, false, locale);
    assert.equal("appleSecretInvalid" in dict.login.errors, false, locale);
    assert.equal(dict.login.lede.includes("Apple"), false, locale);
    assert.equal(dict.login.errors.oauthFailed.includes("Apple"), false, locale);
    assert.equal(dict.login.errors.oauthFailed.includes("AUTH_APPLE"), false, locale);
    assert.ok(
      dict.privacy.paragraphs.every((paragraph) => !paragraph.includes("Apple")),
      locale,
    );
    assert.ok(dict.onboarding.profileTitle.length > 0, locale);
    assert.ok(dict.onboarding.businessTitle.length > 0, locale);
    assert.match(dict.onboarding.businessLede, /InvoiceFlow Studio/);
    assert.equal(dict.onboarding.businessLede.toLowerCase().includes(["joi", "st"].join("")), false);
  }
});

test("Message us stays a translated label and never prints the contact address", () => {
  const email = "galit.igor@yahoo.com";
  for (const locale of LOCALES) {
    const dict = getDictionary(locale);
    assert.ok(dict.nav.messageUs.length > 0);
    assert.equal(dict.nav.messageUs.includes("@"), false);
    assert.equal(JSON.stringify(dict).includes(email), false);
  }

  const footer = readFileSync(path.join(import.meta.dirname, "../components/marketing/shell.tsx"), "utf8");
  assert.match(footer, /\{copy\.messageUs\}/);
  assert.match(footer, /CONTACT_PATH/);
  assert.equal(footer.includes(email), false);
  assert.equal(footer.includes("mailto:"), false);
});
