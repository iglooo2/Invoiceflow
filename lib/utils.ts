import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { resolvedAuthUrl } from "@/lib/auth-env";
import { readRuntimeSecret } from "@/lib/runtime-env";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAppUrl() {
  return readRuntimeSecret("NEXT_PUBLIC_APP_URL") || resolvedAuthUrl();
}

export function isDevMode() {
  if (process.env.AUTH_DEV_MODE === "true") return true;
  if (process.env.AUTH_DEV_MODE === "false") return false;
  return process.env.NODE_ENV !== "production";
}
