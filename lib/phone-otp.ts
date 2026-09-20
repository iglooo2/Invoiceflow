import { getDictionary } from "@/lib/dictionary";
import { isLocale } from "@/lib/i18n";
import { composePhone, digitsOnly, isValidPhone } from "@/lib/onboarding";

export const PHONE_OTP_COOLDOWN_SECONDS = 60;
export const PHONE_OTP_COOLDOWN_MS = PHONE_OTP_COOLDOWN_SECONDS * 1000;
export const PHONE_OTP_WINDOW_MS = 60 * 60 * 1000;
export const PHONE_OTP_MAX_SENDS_PER_PHONE = 5;
export const PHONE_OTP_MAX_SENDS_PER_IP = 10;
export const PHONE_OTP_MAX_CHECKS = 5;
export const PHONE_OTP_TTL_MS = 10 * 60 * 1000;
export const PHONE_TICKET_TTL_MS = 2 * 60 * 1000;
export const PHONE_OTP_LENGTH = 6;

export type SendGateOk = { ok: true; sendCount: number; windowStart: number };
export type SendGateBlocked = { ok: false; reason: "cooldown" | "rate"; retryAfterSeconds: number };
export type SendGate = SendGateOk | SendGateBlocked;

export function toE164(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const compact = trimmed.startsWith("+") ? trimmed : `+${digitsOnly(trimmed)}`;
  const digits = digitsOnly(compact);
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export function resolveAuthPhone(countryIso: string, nationalNumber: string): string | null {
  const national = nationalNumber.trim();
  if (national.startsWith("+")) return toE164(national);
  const composed = composePhone(countryIso, national);
  return isValidPhone(composed) ? composed : null;
}

export function maskPhone(phone: string) {
  const digits = digitsOnly(phone);
  if (digits.length < 4) return "+••••";
  return `+••••${digits.slice(-4)}`;
}

export function encodeBasicAuth(username: string, password: string) {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function twilioVerifySendUrl(serviceSid: string) {
  return `https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/Verifications`;
}

export function twilioVerifyCheckUrl(serviceSid: string) {
  return `https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/VerificationCheck`;
}

export function twilioMessagesUrl(accountSid: string) {
  return `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
}

export function nextSendState(args: {
  now: number;
  windowStart: number | null;
  sendCount: number;
  lastSentAt: number | null;
  maxSends: number;
  windowMs?: number;
  cooldownMs?: number;
}): SendGate {
  const windowMs = args.windowMs ?? PHONE_OTP_WINDOW_MS;
  const cooldownMs = args.cooldownMs ?? PHONE_OTP_COOLDOWN_MS;
  const windowStart =
    args.windowStart != null && args.now - args.windowStart < windowMs ? args.windowStart : args.now;
  const sendCount = windowStart === args.windowStart ? args.sendCount : 0;
  if (args.lastSentAt != null && args.now - args.lastSentAt < cooldownMs) {
    return {
      ok: false,
      reason: "cooldown",
      retryAfterSeconds: Math.max(1, Math.ceil((cooldownMs - (args.now - args.lastSentAt)) / 1000)),
    };
  }
  if (sendCount >= args.maxSends) {
    return {
      ok: false,
      reason: "rate",
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (args.now - windowStart)) / 1000)),
    };
  }
  return { ok: true, sendCount: sendCount + 1, windowStart };
}

export function nextCheckState(args: { attempts: number; maxChecks?: number }): SendGate {
  const maxChecks = args.maxChecks ?? PHONE_OTP_MAX_CHECKS;
  if (args.attempts >= maxChecks) {
    return { ok: false, reason: "rate", retryAfterSeconds: Math.ceil(PHONE_OTP_COOLDOWN_MS / 1000) };
  }
  return { ok: true, sendCount: args.attempts + 1, windowStart: Date.now() };
}

export function randomOtp(length = PHONE_OTP_LENGTH) {
  const max = 10 ** length;
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n = new DataView(bytes.buffer).getUint32(0, false) % max;
  return n.toString().padStart(length, "0");
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function bytesToHex(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return [...view].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(digest);
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bytesToHex(sig);
}

export async function hashOtpCode(secret: string, phone: string, code: string) {
  return sha256Hex(`sms-otp:${secret}:${phone}:${code}`);
}

export async function hashClientIp(secret: string, ip: string) {
  return sha256Hex(`sms-ip:${secret}:${ip.trim() || "unknown"}`);
}

export async function createPhoneTicket(
  secret: string,
  phone: string,
  now = Date.now(),
  locale = "en",
) {
  const exp = now + PHONE_TICKET_TTL_MS;
  const safeLocale = isLocale(locale) ? locale : "en";
  const sig = await hmacHex(secret, `phone-ticket:${phone}:${exp}:${safeLocale}`);
  return `${exp}.${safeLocale}.${sig}`;
}

export async function verifyPhoneTicket(secret: string, phone: string, ticket: string, now = Date.now()) {
  const [expRaw, locale, sig] = ticket.split(".");
  const exp = Number(expRaw);
  if (!expRaw || !locale || !sig || !Number.isFinite(exp) || exp < now) return null;
  const expected = await hmacHex(secret, `phone-ticket:${phone}:${exp}:${locale}`);
  if (!timingSafeEqual(sig, expected)) return null;
  return { locale: isLocale(locale) ? locale : "en" };
}

export function programmableSmsBody(code: string) {
  return `Your InvoiceFlow Studio verification code is ${code}. It expires in 10 minutes.`;
}

export function accountConfirmedSmsBody(locale: string) {
  const dict = getDictionary(isLocale(locale) ? locale : "en");
  return dict.login.phoneConfirmedSms;
}

export function genericPhoneSendCopy() {
  return "We sent a text with a verification code.";
}

export function phoneExistenceLeak(text: string) {
  return /no account|doesn't exist|does not exist|already registered|account exists|not found for that phone/i.test(
    text,
  );
}
