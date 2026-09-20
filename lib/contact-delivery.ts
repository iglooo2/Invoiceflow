import { CONTACT_EMAIL } from "./site";

export type ContactSendReason = "not_configured" | "send_failed";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function extractEmailAddress(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const angled = trimmed.match(/<([^>]+)>/);
  const raw = (angled?.[1] ?? trimmed).trim().toLowerCase();
  return EMAIL_RE.test(raw) ? raw : "";
}

/** Prefer Worker CONTACT_TO, then CONTACT_EMAIL, then the compiled default inbox. */
export function resolveContactMailbox(...candidates: Array<string | undefined | null>) {
  for (const candidate of candidates) {
    const email = extractEmailAddress(String(candidate ?? ""));
    if (email) return email;
  }
  return CONTACT_EMAIL;
}

export function classifyResendFailure(error: string): ContactSendReason {
  const blob = error.toLowerCase();
  if (
    blob.includes("401") ||
    blob.includes("invalid api key") ||
    blob.includes("missing api key") ||
    blob.includes("unauthorized")
  ) {
    return "not_configured";
  }
  return "send_failed";
}
