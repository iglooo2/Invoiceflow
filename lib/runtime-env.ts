import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Worker secrets live on the Cloudflare request env. Next.js may inline an
 * empty `process.env.NAME` from the build, so callers should prefer this
 * value when it is present.
 */
export function readCloudflareString(name: string): string {
  try {
    const ctx = getCloudflareContext();
    const value = (ctx.env as Record<string, unknown> | undefined)?.[name];
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

/**
 * Prefer the Worker secret, then `process.env[name]` (bracket access so Next
 * does not replace the lookup with a build-time empty string).
 */
export function readRuntimeSecret(name: string): string {
  const fromCloudflare = readCloudflareString(name);
  if (fromCloudflare) return fromCloudflare;
  return (process.env[name] ?? "").trim();
}
