import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getDictionary } from "./dictionary";
import { LOCALES } from "./i18n";
import { smsAuthEnabled } from "./auth-env";
import { genericPhoneSendCopy, phoneExistenceLeak, twilioVerifySendUrl } from "./phone-otp";
import { twilioFormPost } from "./phone-auth";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("smsAuthEnabled needs Twilio SID, token, and Verify or From number", () => {
  const previous = {
    sid: process.env.TWILIO_ACCOUNT_SID,
    token: process.env.TWILIO_AUTH_TOKEN,
    verify: process.env.TWILIO_VERIFY_SERVICE_SID,
    from: process.env.TWILIO_FROM_NUMBER,
    alias: process.env.TWILIO_PHONE_NUMBER,
  };
  try {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
    delete process.env.TWILIO_FROM_NUMBER;
    delete process.env.TWILIO_PHONE_NUMBER;
    assert.equal(smsAuthEnabled(), false);
    process.env.TWILIO_ACCOUNT_SID = "ACtest";
    process.env.TWILIO_AUTH_TOKEN = "token";
    assert.equal(smsAuthEnabled(), false);
    process.env.TWILIO_VERIFY_SERVICE_SID = "VAtest";
    assert.equal(smsAuthEnabled(), true);
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
    process.env.TWILIO_FROM_NUMBER = "+15555550100";
    assert.equal(smsAuthEnabled(), true);
  } finally {
    restoreEnv("TWILIO_ACCOUNT_SID", previous.sid);
    restoreEnv("TWILIO_AUTH_TOKEN", previous.token);
    restoreEnv("TWILIO_VERIFY_SERVICE_SID", previous.verify);
    restoreEnv("TWILIO_FROM_NUMBER", previous.from);
    restoreEnv("TWILIO_PHONE_NUMBER", previous.alias);
  }
});

test("Twilio posts use fetch Basic auth, not the Node SDK", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetcher: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ status: "pending" }), { status: 201 });
  };
  const result = await twilioFormPost(
    twilioVerifySendUrl("VA123"),
    { To: "+14155550148", Channel: "sms" },
    { accountSid: "ACabc", authToken: "secret" },
    fetcher,
  );
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://verify.twilio.com/v2/Services/VA123/Verifications");
  assert.equal(calls[0].init.method, "POST");
  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get("content-type"), "application/x-www-form-urlencoded");
  assert.match(headers.get("authorization") ?? "", /^Basic /);
  assert.equal(String(calls[0].init.body), "To=%2B14155550148&Channel=sms");

  const pkg = JSON.parse(readFileSync(path.join(import.meta.dirname, "../package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.equal("twilio" in (pkg.dependencies ?? {}), false);
  assert.equal("twilio" in (pkg.devDependencies ?? {}), false);
});

test("login phone copy is translated and does not leak whether a number exists", () => {
  for (const locale of LOCALES) {
    const dict = getDictionary(locale);
    assert.ok(dict.login.phone.length > 0, locale);
    assert.ok(dict.login.phoneHint.includes("TWILIO_ACCOUNT_SID"), locale);
    assert.ok(dict.login.errors.phoneCodeInvalid.length > 0, locale);
    assert.ok(dict.login.errors.phoneRateLimited.length > 0, locale);
    assert.ok(dict.onboarding.errors.phoneTaken.length > 0, locale);
    assert.equal(phoneExistenceLeak(dict.login.codeSent), false, locale);
    assert.equal(phoneExistenceLeak(dict.login.errors.phoneSendFailed), false, locale);
    assert.equal(phoneExistenceLeak(dict.login.errors.phoneCodeInvalid), false, locale);
  }
  assert.equal(phoneExistenceLeak(genericPhoneSendCopy()), false);
});

test("phone SMS is wired through Auth.js credentials and the login card", () => {
  const auth = readFileSync(path.join(import.meta.dirname, "auth.ts"), "utf8");
  const actions = readFileSync(path.join(import.meta.dirname, "../app/actions/auth.ts"), "utf8");
  const forms = readFileSync(path.join(import.meta.dirname, "../app/[locale]/login/auth-forms.tsx"), "utf8");
  const login = readFileSync(path.join(import.meta.dirname, "../app/[locale]/login/page.tsx"), "utf8");
  const phoneAuth = readFileSync(path.join(import.meta.dirname, "phone-auth.ts"), "utf8");
  const phoneOtp = readFileSync(path.join(import.meta.dirname, "phone-otp.ts"), "utf8");
  const schema = readFileSync(path.join(import.meta.dirname, "../prisma/schema.prisma"), "utf8");
  const sql = readFileSync(path.join(import.meta.dirname, "../prisma/add-phone-auth.sql"), "utf8");

  assert.match(auth, /id: "phone"/);
  assert.match(auth, /authorizePhoneTicket/);
  assert.doesNotMatch(auth, /from ["']twilio["']/);
  assert.match(actions, /requestPhoneOtp/);
  assert.match(actions, /loginWithPhone/);
  assert.match(actions, /signIn\("phone"/);
  assert.match(forms, /copy\.phone/);
  assert.match(forms, /data-phone-auth/);
  assert.match(forms, /requestPhoneOtp/);
  assert.match(forms, /one-time-code/);
  assert.match(login, /smsEnabled=\{smsAuthEnabled\(\)\}/);
  assert.match(phoneAuth, /typeof fetch = fetch/);
  assert.match(phoneAuth, /twilioVerifySendUrl/);
  assert.match(phoneAuth, /twilioMessagesUrl/);
  assert.match(phoneOtp, /verify\.twilio\.com/);
  assert.match(phoneOtp, /api\.twilio\.com/);
  assert.doesNotMatch(phoneAuth, /from ["']twilio["']/);
  assert.doesNotMatch(phoneAuth, /require\(["']twilio["']\)/);
  assert.match(schema, /phone\s+String\?\s+@unique/);
  assert.match(schema, /model PhoneAuthChallenge/);
  assert.match(schema, /model PhoneAuthIpLimit/);
  assert.match(sql, /User_phone_key/);
  assert.match(sql, /PhoneAuthChallenge/);
});
