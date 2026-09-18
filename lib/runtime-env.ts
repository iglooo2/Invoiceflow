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
