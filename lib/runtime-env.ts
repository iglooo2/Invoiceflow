import { getCloudflareContext } from "@opennextjs/cloudflare";

type CloudflareEnvRecord = Record<string, unknown>;

/**
 * Last Worker `env` from `getCloudflareContext({ async: true })`.
 * Auth.js `setEnvDefaults` reads `process.env.AUTH_SECRET` (often inlined
 * empty at `cf:build`); we copy from this object onto `process.env` per request.
 */
let lastCloudflareEnv: CloudflareEnvRecord | undefined;

function asEnvRecord(env: unknown): CloudflareEnvRecord | undefined {
  if (env && typeof env === "object") return env as CloudflareEnvRecord;
  return undefined;
}

function rememberCloudflareEnv(env: unknown) {
  const record = asEnvRecord(env);
  if (record) lastCloudflareEnv = record;
}

/**
 * Worker secrets live on the Cloudflare request env. Next.js may inline an
 * empty `process.env.NAME` from the build, so callers should prefer this
 * value when it is present.
 */
export function readCloudflareString(name: string): string {
  const cached = lastCloudflareEnv?.[name];
  if (typeof cached === "string" && cached.trim()) return cached.trim();
  try {
    const ctx = getCloudflareContext();
    rememberCloudflareEnv(ctx.env);
    const value = (ctx.env as CloudflareEnvRecord | undefined)?.[name];
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

/**
 * Populate OpenNext's Cloudflare context (async mode works when sync global
 * state is not ready yet). No-op locally if Wrangler context is absent.
 */
export async function ensureCloudflareContext() {
  try {
    const ctx = await getCloudflareContext({ async: true });
    rememberCloudflareEnv(ctx.env);
    return ctx;
  } catch {
    try {
      const ctx = getCloudflareContext();
      rememberCloudflareEnv(ctx.env);
      return ctx;
    } catch {
      // `next dev` without a Worker request still has `.env` on process.env.
      return undefined;
    }
  }
}

/**
 * Copy string Worker bindings that Auth.js / Next look up on `process.env`.
 * Runtime secrets are not on Build-only vars; Auth.js will not see them unless
 * they are on this object (and passed as `secret:` on the Auth.js config).
 */
export function copyCloudflareAuthEnvToProcess() {
  const env = lastCloudflareEnv;
  if (!env) return;
  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== "string" || !value.trim()) continue;
    if (
      key.startsWith("AUTH_") ||
      key.startsWith("NEXTAUTH_") ||
      key.startsWith("GOOGLE_")
    ) {
      process.env[key] = value.trim();
    }
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
