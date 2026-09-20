import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PHONE_OTP_COOLDOWN_MS,
  PHONE_OTP_MAX_SENDS_PER_PHONE,
  accountConfirmedSmsBody,
  createPhoneTicket,
  encodeBasicAuth,
  genericPhoneSendCopy,
  hashOtpCode,
  maskPhone,
  nextCheckState,
  nextSendState,
  phoneExistenceLeak,
  programmableSmsBody,
  resolveAuthPhone,
  timingSafeEqual,
  toE164,
  twilioMessagesUrl,
  twilioVerifyCheckUrl,
  twilioVerifySendUrl,
  verifyPhoneTicket,
} from "./phone-otp";

test("toE164 and resolveAuthPhone store compact international numbers", () => {
  assert.equal(toE164("+1 (415) 555-0148"), "+14155550148");
  assert.equal(toE164("555"), null);
  assert.equal(toE164(""), null);
  assert.equal(resolveAuthPhone("US", "415 555 0148"), "+14155550148");
  assert.equal(resolveAuthPhone("US", "+447700900123"), "+447700900123");
  assert.equal(resolveAuthPhone("GB", "7700 900123"), "+447700900123");
  assert.equal(maskPhone("+14155550148"), "+••••0148");
});

test("send gate enforces cooldown and hourly caps without leaking account state", () => {
  const now = 1_000_000;
  const first = nextSendState({
    now,
    windowStart: null,
    sendCount: 0,
    lastSentAt: null,
    maxSends: PHONE_OTP_MAX_SENDS_PER_PHONE,
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const cooling = nextSendState({
    now: now + 1_000,
    windowStart: first.windowStart,
    sendCount: first.sendCount,
    lastSentAt: now,
    maxSends: PHONE_OTP_MAX_SENDS_PER_PHONE,
  });
  assert.equal(cooling.ok, false);
  if (cooling.ok) return;
  assert.equal(cooling.reason, "cooldown");
  assert.ok(cooling.retryAfterSeconds > 0);
  assert.ok(cooling.retryAfterSeconds <= Math.ceil(PHONE_OTP_COOLDOWN_MS / 1000));

  const capped = nextSendState({
    now: now + PHONE_OTP_COOLDOWN_MS + 1,
    windowStart: now,
    sendCount: PHONE_OTP_MAX_SENDS_PER_PHONE,
    lastSentAt: now,
    maxSends: PHONE_OTP_MAX_SENDS_PER_PHONE,
  });
  assert.equal(capped.ok, false);
  if (capped.ok) return;
  assert.equal(capped.reason, "rate");
});

test("check gate blocks after too many code attempts", () => {
  assert.equal(nextCheckState({ attempts: 0 }).ok, true);
  const blocked = nextCheckState({ attempts: 5 });
  assert.equal(blocked.ok, false);
  if (blocked.ok) return;
  assert.equal(blocked.reason, "rate");
});

test("Twilio URLs are public HTTPS Verify or Messages endpoints", () => {
  assert.equal(
    twilioVerifySendUrl("VA123"),
    "https://verify.twilio.com/v2/Services/VA123/Verifications",
  );
  assert.equal(
    twilioVerifyCheckUrl("VA123"),
    "https://verify.twilio.com/v2/Services/VA123/VerificationCheck",
  );
  assert.equal(
    twilioMessagesUrl("ACabc"),
    "https://api.twilio.com/2010-04-01/Accounts/ACabc/Messages.json",
  );
  assert.equal(encodeBasicAuth("ACabc", "token"), btoa("ACabc:token"));
  assert.match(programmableSmsBody("123456"), /123456/);
  assert.equal(phoneExistenceLeak(genericPhoneSendCopy()), false);
  assert.equal(phoneExistenceLeak("We sent a text with a verification code."), false);
  assert.equal(phoneExistenceLeak("No account exists for that phone"), true);
});

test("confirmation SMS copy is not a second OTP and is translated", () => {
  assert.equal(accountConfirmedSmsBody("en"), "Your InvoiceFlow Studio account is confirmed.");
  assert.match(accountConfirmedSmsBody("es"), /InvoiceFlow Studio/);
  assert.match(accountConfirmedSmsBody("fr"), /confirm/i);
  assert.equal(/\d{4,}/.test(accountConfirmedSmsBody("en")), false);
  assert.equal(phoneExistenceLeak(accountConfirmedSmsBody("en")), false);
});

test("phone tickets HMAC-expire, carry locale, and OTP hashes compare in constant time", async () => {
  const secret = "test-secret";
  const phone = "+14155550148";
  const ticket = await createPhoneTicket(secret, phone, 1_700_000_000_000, "es");
  assert.deepEqual(await verifyPhoneTicket(secret, phone, ticket, 1_700_000_000_000), { locale: "es" });
  assert.equal(await verifyPhoneTicket(secret, phone, ticket, 1_700_000_000_000 + 3 * 60 * 1000), null);
  assert.equal(await verifyPhoneTicket("other", phone, ticket, 1_700_000_000_000), null);
  assert.equal(await verifyPhoneTicket(secret, "+15555550100", ticket, 1_700_000_000_000), null);
  const hash = await hashOtpCode(secret, phone, "123456");
  const same = await hashOtpCode(secret, phone, "123456");
  const other = await hashOtpCode(secret, phone, "000000");
  assert.equal(timingSafeEqual(hash, same), true);
  assert.equal(timingSafeEqual(hash, other), false);
  assert.equal(timingSafeEqual("abc", "ab"), false);
});
