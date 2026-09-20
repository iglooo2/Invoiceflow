import { headers } from "next/headers";
import {
  firstAuthSecret,
  readAuthSecret,
  resolvedAuthSecret,
  smsAuthEnabled,
  twilioFromNumber,
  twilioVerifyServiceSid,
} from "@/lib/auth-env";
import { prisma } from "@/lib/db";
import { isMissingDatabaseSchemaError, safeErrorLog } from "@/lib/db-errors";
import { markNewUserOnboarding } from "@/lib/onboarding";
import {
  PHONE_OTP_COOLDOWN_MS,
  PHONE_OTP_MAX_CHECKS,
  PHONE_OTP_MAX_SENDS_PER_IP,
  PHONE_OTP_MAX_SENDS_PER_PHONE,
  PHONE_OTP_TTL_MS,
  accountConfirmedSmsBody,
  createPhoneTicket,
  encodeBasicAuth,
  hashClientIp,
  hashOtpCode,
  maskPhone,
  nextCheckState,
  nextSendState,
  programmableSmsBody,
  randomOtp,
  timingSafeEqual,
  toE164,
  twilioMessagesUrl,
  twilioVerifyCheckUrl,
  twilioVerifySendUrl,
  verifyPhoneTicket as verifySignedPhoneTicket,
} from "@/lib/phone-otp";

export type PhoneAuthErrorKey =
  | "phoneInvalid"
  | "phoneNotConfigured"
  | "phoneSendFailed"
  | "phoneCodeInvalid"
  | "phoneRateLimited"
  | "phoneSignInFailed";

type TwilioJson = Record<string, unknown>;

export async function requestClientIp() {
  const h = await headers();
  const cf = h.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return h.get("x-real-ip")?.trim() || "unknown";
}

export async function twilioFormPost(
  url: string,
  body: Record<string, string>,
  config: { accountSid: string; authToken: string },
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodeBasicAuth(config.accountSid, config.authToken)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  const text = await response.text();
  let json: TwilioJson = {};
  try {
    json = text ? (JSON.parse(text) as TwilioJson) : {};
  } catch {
    json = { raw: text };
  }
  return { ok: response.ok, status: response.status, json };
}

function twilioCredentials() {
  return {
    accountSid: readAuthSecret("TWILIO_ACCOUNT_SID"),
    authToken: readAuthSecret("TWILIO_AUTH_TOKEN"),
  };
}

function twilioRateLimited(status: number, json: TwilioJson) {
  const code = Number(json.code ?? json.status);
  return status === 429 || code === 60203 || code === 60202;
}

function signingSecret() {
  return resolvedAuthSecret() || firstAuthSecret("AUTH_SECRET") || "dev-insecure-secret-change-me";
}

async function upsertPhoneSend(phone: string, now: Date) {
  const existing = await prisma.phoneAuthChallenge.findUnique({ where: { phone } });
  const gate = nextSendState({
    now: now.getTime(),
    windowStart: existing?.windowStart.getTime() ?? null,
    sendCount: existing?.sendCount ?? 0,
    lastSentAt: existing?.lastSentAt.getTime() ?? null,
    maxSends: PHONE_OTP_MAX_SENDS_PER_PHONE,
  });
  if (!gate.ok) return gate;
  const expiresAt = new Date(now.getTime() + PHONE_OTP_TTL_MS);
  const data = {
    sendCount: gate.sendCount,
    windowStart: new Date(gate.windowStart),
    lastSentAt: now,
    expiresAt,
    attempts: 0,
  };
  if (existing) {
    await prisma.phoneAuthChallenge.update({ where: { phone }, data });
  } else {
    await prisma.phoneAuthChallenge.create({
      data: { phone, ...data },
    });
  }
  return gate;
}

async function upsertIpSend(ipHash: string, now: Date) {
  const existing = await prisma.phoneAuthIpLimit.findUnique({ where: { ipHash } });
  const gate = nextSendState({
    now: now.getTime(),
    windowStart: existing?.windowStart.getTime() ?? null,
    sendCount: existing?.sendCount ?? 0,
    lastSentAt: existing?.lastSentAt.getTime() ?? null,
    maxSends: PHONE_OTP_MAX_SENDS_PER_IP,
  });
  if (!gate.ok) return gate;
  const data = {
    sendCount: gate.sendCount,
    windowStart: new Date(gate.windowStart),
    lastSentAt: now,
  };
  if (existing) {
    await prisma.phoneAuthIpLimit.update({ where: { ipHash }, data });
  } else {
    await prisma.phoneAuthIpLimit.create({ data: { ipHash, ...data } });
  }
  return gate;
}

async function enforceSendLimits(phone: string, ip: string, now: Date) {
  const ipHash = await hashClientIp(signingSecret(), ip);
  try {
    const ipGate = await upsertIpSend(ipHash, now);
    if (!ipGate.ok) return ipGate;
    return await upsertPhoneSend(phone, now);
  } catch (error) {
    if (isMissingDatabaseSchemaError(error)) {
      console.error("phone auth tables missing", safeErrorLog(error));
      return { ok: true as const, sendCount: 1, windowStart: now.getTime(), schemaMissing: true };
    }
    throw error;
  }
}

async function sendViaTwilioVerify(phone: string, locale: string) {
  const serviceSid = twilioVerifyServiceSid();
  const credentials = twilioCredentials();
  return twilioFormPost(twilioVerifySendUrl(serviceSid), {
    To: phone,
    Channel: "sms",
    Locale: locale || "en",
  }, credentials);
}

async function sendViaTwilioSms(phone: string, body: string, fetcher: typeof fetch = fetch) {
  const credentials = twilioCredentials();
  const from = twilioFromNumber();
  if (!from) {
    return { ok: false as const, status: 0, json: { error: "missing_from" } as TwilioJson, skipped: true as const };
  }
  return twilioFormPost(
    twilioMessagesUrl(credentials.accountSid),
    {
      To: phone,
      From: from,
      Body: body,
    },
    credentials,
    fetcher,
  );
}

export async function sendRegistrationConfirmedSms(
  phone: string,
  locale: string,
  fetcher: typeof fetch = fetch,
) {
  const e164 = toE164(phone);
  if (!e164) return { ok: false as const, skipped: true as const };
  const from = twilioFromNumber();
  if (!from) {
    console.error("registration confirmation SMS skipped: set TWILIO_FROM_NUMBER as a Worker Runtime secret");
    return { ok: false as const, skipped: true as const };
  }
  try {
    const sent = await sendViaTwilioSms(e164, accountConfirmedSmsBody(locale), fetcher);
    if ("skipped" in sent && sent.skipped) return { ok: false as const, skipped: true as const };
    if (!sent.ok) {
      console.error("registration confirmation SMS failed", maskPhone(e164), sent.status, sent.json.code ?? sent.json.error);
      return { ok: false as const, skipped: false as const };
    }
    return { ok: true as const };
  } catch (error) {
    console.error("registration confirmation SMS failed", maskPhone(e164), safeErrorLog(error));
    return { ok: false as const, skipped: false as const };
  }
}

async function storeHashedCode(phone: string, code: string, schemaMissing: boolean) {
  if (schemaMissing) {
    throw new Error("PhoneAuthChallenge table is required for Programmable SMS codes");
  }
  const codeHash = await hashOtpCode(signingSecret(), phone, code);
  await prisma.phoneAuthChallenge.update({
    where: { phone },
    data: { codeHash, attempts: 0, expiresAt: new Date(Date.now() + PHONE_OTP_TTL_MS) },
  });
}

/** Sends the verification SMS only. Never creates a User. */
export async function sendPhoneOtp(options: { phone: string; ip: string; locale: string }) {
  const phone = toE164(options.phone);
  if (!phone) return { ok: false as const, errorKey: "phoneInvalid" as PhoneAuthErrorKey };
  if (!smsAuthEnabled()) {
    return { ok: false as const, errorKey: "phoneNotConfigured" as PhoneAuthErrorKey };
  }

  const now = new Date();
  let schemaMissing = false;
  try {
    const gate = await enforceSendLimits(phone, options.ip, now);
    if (!gate.ok) {
      return {
        ok: false as const,
        errorKey: "phoneRateLimited" as PhoneAuthErrorKey,
        retryAfterSeconds: gate.retryAfterSeconds,
      };
    }
    schemaMissing = "schemaMissing" in gate && gate.schemaMissing === true;
  } catch (error) {
    console.error("phone send rate limit failed", maskPhone(phone), safeErrorLog(error));
    return { ok: false as const, errorKey: "phoneSendFailed" as PhoneAuthErrorKey };
  }

  const verifySid = twilioVerifyServiceSid();
  try {
    if (verifySid) {
      const sent = await sendViaTwilioVerify(phone, options.locale);
      if (twilioRateLimited(sent.status, sent.json)) {
        return {
          ok: false as const,
          errorKey: "phoneRateLimited" as PhoneAuthErrorKey,
          retryAfterSeconds: Math.ceil(PHONE_OTP_COOLDOWN_MS / 1000),
        };
      }
      if (!sent.ok) {
        console.error("twilio verify send failed", maskPhone(phone), sent.status, sent.json.code);
        return { ok: false as const, errorKey: "phoneSendFailed" as PhoneAuthErrorKey };
      }
    } else {
      const code = randomOtp();
      await storeHashedCode(phone, code, schemaMissing);
      const sent = await sendViaTwilioSms(phone, programmableSmsBody(code));
      if (twilioRateLimited(sent.status, sent.json)) {
        return {
          ok: false as const,
          errorKey: "phoneRateLimited" as PhoneAuthErrorKey,
          retryAfterSeconds: Math.ceil(PHONE_OTP_COOLDOWN_MS / 1000),
        };
      }
      if (!sent.ok) {
        console.error("twilio sms send failed", maskPhone(phone), sent.status, sent.json.code ?? sent.json.error);
        return { ok: false as const, errorKey: "phoneSendFailed" as PhoneAuthErrorKey };
      }
    }
  } catch (error) {
    console.error("phone otp send failed", maskPhone(phone), safeErrorLog(error));
    return { ok: false as const, errorKey: "phoneSendFailed" as PhoneAuthErrorKey };
  }

  return {
    ok: true as const,
    retryAfterSeconds: Math.ceil(PHONE_OTP_COOLDOWN_MS / 1000),
  };
}

async function incrementCheckAttempts(phone: string) {
  try {
    const existing = await prisma.phoneAuthChallenge.findUnique({ where: { phone } });
    if (!existing) return;
    await prisma.phoneAuthChallenge.update({
      where: { phone },
      data: { attempts: existing.attempts + 1 },
    });
  } catch (error) {
    if (!isMissingDatabaseSchemaError(error)) {
      console.error("phone check attempt update failed", maskPhone(phone), safeErrorLog(error));
    }
  }
}

async function loadChallenge(phone: string) {
  try {
    return await prisma.phoneAuthChallenge.findUnique({ where: { phone } });
  } catch (error) {
    if (isMissingDatabaseSchemaError(error)) return null;
    throw error;
  }
}

/**
 * Checks the SMS code. On success issues a short-lived ticket.
 * Does not create a User — that happens in authorizePhoneTicket after this check.
 */
export async function confirmPhoneOtp(options: { phone: string; code: string; locale?: string }) {
  const phone = toE164(options.phone);
  const code = options.code.replace(/\s+/g, "");
  if (!phone) return { ok: false as const, errorKey: "phoneInvalid" as PhoneAuthErrorKey };
  if (!/^\d{6}$/.test(code)) {
    return { ok: false as const, errorKey: "phoneCodeInvalid" as PhoneAuthErrorKey };
  }
  if (!smsAuthEnabled()) {
    return { ok: false as const, errorKey: "phoneNotConfigured" as PhoneAuthErrorKey };
  }

  const challenge = await loadChallenge(phone);
  const checkGate = nextCheckState({ attempts: challenge?.attempts ?? 0, maxChecks: PHONE_OTP_MAX_CHECKS });
  if (!checkGate.ok) {
    return { ok: false as const, errorKey: "phoneRateLimited" as PhoneAuthErrorKey };
  }

  const verifySid = twilioVerifyServiceSid();
  try {
    if (verifySid) {
      const checked = await twilioFormPost(twilioVerifyCheckUrl(verifySid), {
        To: phone,
        Code: code,
      }, twilioCredentials());
      if (twilioRateLimited(checked.status, checked.json)) {
        await incrementCheckAttempts(phone);
        return { ok: false as const, errorKey: "phoneRateLimited" as PhoneAuthErrorKey };
      }
      const status = String(checked.json.status ?? "");
      if (!checked.ok || status !== "approved") {
        await incrementCheckAttempts(phone);
        return { ok: false as const, errorKey: "phoneCodeInvalid" as PhoneAuthErrorKey };
      }
    } else {
      if (!challenge?.codeHash || challenge.expiresAt.getTime() < Date.now()) {
        await incrementCheckAttempts(phone);
        return { ok: false as const, errorKey: "phoneCodeInvalid" as PhoneAuthErrorKey };
      }
      const expected = await hashOtpCode(signingSecret(), phone, code);
      if (!timingSafeEqual(expected, challenge.codeHash)) {
        await incrementCheckAttempts(phone);
        return { ok: false as const, errorKey: "phoneCodeInvalid" as PhoneAuthErrorKey };
      }
    }
  } catch (error) {
    console.error("phone otp check failed", maskPhone(phone), safeErrorLog(error));
    return { ok: false as const, errorKey: "phoneSendFailed" as PhoneAuthErrorKey };
  }

  try {
    await prisma.phoneAuthChallenge.update({
      where: { phone },
      data: { codeHash: null, attempts: 0 },
    });
  } catch (error) {
    if (!isMissingDatabaseSchemaError(error)) {
      console.error("phone challenge consume failed", maskPhone(phone), safeErrorLog(error));
    }
  }

  const ticket = await createPhoneTicket(signingSecret(), phone, Date.now(), options.locale ?? "en");
  return { ok: true as const, phone, ticket };
}

export async function authorizePhoneTicket(phoneRaw: string, ticket: string) {
  const phone = toE164(phoneRaw);
  if (!phone || !ticket) return null;
  const verified = await verifySignedPhoneTicket(signingSecret(), phone, ticket);
  if (!verified) return null;
  const result = await findOrCreatePhoneUser(phone);
  if (result.created) {
    await sendRegistrationConfirmedSms(phone, verified.locale);
  }
  return result.user;
}

export async function findOrCreatePhoneUser(phone: string) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return { user: existing, created: false as const };
  const now = new Date();
  try {
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        phone,
        plan: "free",
        createdAt: now,
        updatedAt: now,
        ...markNewUserOnboarding(),
      },
    });
    return { user, created: true as const };
  } catch (error) {
    const raced = await prisma.user.findUnique({ where: { phone } });
    if (raced) return { user: raced, created: false as const };
    throw error;
  }
}
