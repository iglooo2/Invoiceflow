import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SITE_URL } from "@/lib/site";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    (process.env.NODE_ENV === "production" ? SITE_URL : "http://localhost:3000")
  );
}

export function isDevMode() {
  if (process.env.AUTH_DEV_MODE === "true") return true;
  if (process.env.AUTH_DEV_MODE === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function githubAuthEnabled() {
  return Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
}

export function googleAuthEnabled() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

export function appleAuthEnabled() {
  return Boolean(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET);
}

export function resendEnabled() {
  return Boolean(process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY);
}
