import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getDictionary } from "./dictionary";
import {
  DEFAULT_LOCALE,
  LOCALES,
  localizedPath,
  matchLocale,
  negotiateLocale,
  parseAcceptLanguage,
  shouldSkipLocale,
  splitLocalePath,
} from "./i18n";

test("localizedPath prefixes marketing routes", () => {
  assert.equal(localizedPath("en", "/"), "/en");
  assert.equal(localizedPath("es", "/pricing"), "/es/pricing");
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
  assert.equal(shouldSkipLocale("/icon"), true);
  assert.equal(shouldSkipLocale("/pricing"), false);
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

test("language switcher is a compact dropdown, not a row of locale chips", () => {
  const source = readFileSync(
    path.join(import.meta.dirname, "../components/marketing/language-switcher.tsx"),
    "utf8",
  );
  assert.match(source, /DropdownMenu/);
  assert.match(source, /aria-label/);
  assert.match(source, /RadioGroup/);
  assert.equal(source.includes('flex flex-wrap items-center gap-2'), false);
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
  assert.equal(footer.includes(email), false);
});
