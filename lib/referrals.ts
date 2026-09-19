import { nanoid } from "nanoid";
import { SITE_URL } from "@/lib/site";
import { getAppUrl } from "@/lib/utils";

export const REFERRAL_REWARD_USD = 30;
export const REFERRAL_QUALIFYING_DAYS = 65;
export const REFERRAL_COOKIE = "invoiceflow-referral";
export const REFERRAL_CODE_LENGTH = 10;

export function newReferralCode() {
  return nanoid(REFERRAL_CODE_LENGTH);
}

export function isReferralCode(value: string | undefined | null): value is string {
  if (!value) return false;
  return /^[A-Za-z0-9_-]{6,24}$/.test(value);
}

export function referralPath(code: string) {
  return `/r/${code}`;
}

export function publicReferralUrl(code: string, origin = getAppUrl() || SITE_URL) {
  return `${origin.replace(/\/+$/, "")}${referralPath(code)}`;
}

export function canonicalReferralUrl(code: string) {
  return publicReferralUrl(code, SITE_URL);
}
