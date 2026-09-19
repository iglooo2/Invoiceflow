import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  composePhone,
  hasOnboardingBusiness,
  hasOnboardingProfile,
  isValidPhone,
  joinName,
  markNewUserOnboarding,
  needsOnboarding,
  nextOnboardingPath,
  parsePhone,
  splitName,
} from "./onboarding";
import { appleAuthEnabled, googleAuthEnabled } from "./auth-env";

test("new users need onboarding; existing users stay ungated", () => {
  assert.equal(needsOnboarding({ onboardingComplete: false }), true);
  assert.equal(needsOnboarding({ onboardingComplete: true }), false);
  assert.equal(needsOnboarding({}), false);
  assert.deepEqual(markNewUserOnboarding(), { onboardingComplete: false });
});

test("onboarding steps require name, phone, and business fields", () => {
  assert.equal(hasOnboardingProfile({ name: "Maya", phone: "+14155550148" }), true);
  assert.equal(hasOnboardingProfile({ name: "Maya", phone: "" }), false);
  assert.equal(
    hasOnboardingBusiness({
      businessName: "Studio North",
      employeeCount: "2-5",
      industry: "design",
    }),
    true,
  );
  assert.equal(
    hasOnboardingBusiness({
      businessName: "Studio North",
      employeeCount: "many",
      industry: "design",
    }),
    false,
  );
});

test("nextOnboardingPath sends incomplete users through the studio steps", () => {
  const fresh = { onboardingComplete: false };
  assert.equal(nextOnboardingPath(fresh, "en"), "/en/onboarding");
  assert.equal(
    nextOnboardingPath({ onboardingComplete: false, name: "Maya", phone: "+14155550148" }, "es"),
    "/es/onboarding/business",
  );
  assert.equal(
    nextOnboardingPath(
      { onboardingComplete: false, name: "Maya", phone: "+14155550148" },
      "fr",
      true,
    ),
    "/fr/onboarding",
  );
  assert.equal(nextOnboardingPath({ onboardingComplete: true }, "de"), "/dashboard");
});

test("phone helpers compose, parse, and validate E.164-ish numbers", () => {
  assert.equal(composePhone("US", "415 555 0148"), "+14155550148");
  assert.equal(composePhone("GB", "7700 900123"), "+447700900123");
  assert.deepEqual(parsePhone("+447700900123"), { countryIso: "GB", nationalNumber: "7700900123" });
  assert.deepEqual(parsePhone(""), { countryIso: "US", nationalNumber: "" });
  assert.equal(isValidPhone("+14155550148"), true);
  assert.equal(isValidPhone("555"), false);
  assert.deepEqual(splitName("Maya Chen"), { firstName: "Maya", lastName: "Chen" });
  assert.equal(joinName("Maya", "Chen"), "Maya Chen");
  assert.equal(joinName("Maya", ""), "Maya");
});

test("Google and Apple Sign-In require both id and secret", () => {
  const previous = {
    googleId: process.env.AUTH_GOOGLE_ID,
    googleSecret: process.env.AUTH_GOOGLE_SECRET,
    appleId: process.env.AUTH_APPLE_ID,
    appleSecret: process.env.AUTH_APPLE_SECRET,
  };
  try {
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    delete process.env.AUTH_APPLE_ID;
    delete process.env.AUTH_APPLE_SECRET;
    assert.equal(googleAuthEnabled(), false);
    assert.equal(appleAuthEnabled(), false);
    process.env.AUTH_GOOGLE_ID = "id";
    process.env.AUTH_GOOGLE_SECRET = "secret";
    process.env.AUTH_APPLE_ID = "com.invoiceflowstudio.web";
    process.env.AUTH_APPLE_SECRET = "jwt";
    assert.equal(googleAuthEnabled(), true);
    assert.equal(appleAuthEnabled(), true);
  } finally {
    restoreEnv("AUTH_GOOGLE_ID", previous.googleId);
    restoreEnv("AUTH_GOOGLE_SECRET", previous.googleSecret);
    restoreEnv("AUTH_APPLE_ID", previous.appleId);
    restoreEnv("AUTH_APPLE_SECRET", previous.appleSecret);
  }
});

test("schema persists phone, business, and onboarding columns", () => {
  const schema = readFileSync(path.join(import.meta.dirname, "../prisma/schema.prisma"), "utf8");
  assert.match(schema, /phone\s+String\?/);
  assert.match(schema, /employeeCount\s+String\?/);
  assert.match(schema, /industry\s+String\?/);
  assert.match(schema, /onboardingComplete Boolean @default\(true\)/);
});

test("login always renders Google and Apple buttons; dashboard gates new users", () => {
  const forms = readFileSync(path.join(import.meta.dirname, "../app/[locale]/login/auth-forms.tsx"), "utf8");
  const login = readFileSync(path.join(import.meta.dirname, "../app/[locale]/login/page.tsx"), "utf8");
  const auth = readFileSync(path.join(import.meta.dirname, "../lib/auth.ts"), "utf8");
  const layout = readFileSync(path.join(import.meta.dirname, "../app/dashboard/layout.tsx"), "utf8");
  const register = readFileSync(path.join(import.meta.dirname, "../app/actions/auth.ts"), "utf8");
  assert.match(forms, /copy\.google/);
  assert.match(forms, /copy\.apple/);
  assert.match(forms, /disabled/);
  assert.doesNotMatch(forms, /\{googleEnabled \?/);
  assert.doesNotMatch(forms, /\{appleEnabled \?/);
  assert.match(login, /googleEnabled=\{googleAuthEnabled\(\)\}/);
  assert.match(login, /appleEnabled=\{appleAuthEnabled\(\)\}/);
  assert.match(login, /force-dynamic/);
  assert.match(login, /await connection\(\)/);
  assert.match(auth, /next-auth\/providers\/google/);
  assert.match(auth, /next-auth\/providers\/apple/);
  assert.match(auth, /NextAuth\(authOptions\)/);
  assert.match(auth, /readAuthSecret\("AUTH_GOOGLE_ID"\)/);
  assert.match(auth, /createUser/);
  assert.match(layout, /needsOnboarding/);
  assert.match(register, /onboardingComplete: false/);
  assert.doesNotMatch(register, /name: z\.string\(\)\.min\(1\)/);
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
