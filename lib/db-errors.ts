import { isMissingRuntimeDatabaseUrl } from "./db-url";

const SECRET_URL = /postgres(?:ql)?:\/\/[^@\s]+@/gi;

export function redactSecrets(text: string) {
  return text.replace(SECRET_URL, "postgresql://***@").replace(/DATABASE_URL=\S+/gi, "DATABASE_URL=***");
}

export function safeErrorLog(error: unknown) {
  const err = error as { name?: string; code?: string | number; message?: string };
  const name = err?.name || (error as { constructor?: { name?: string } })?.constructor?.name || typeof error;
  const code = err?.code;
  const message = redactSecrets(String(err?.message ?? error));
  return {
    name,
    code: code === undefined ? undefined : String(code),
    message,
  };
}

export function missingRuntimeDatabaseUrlMessage() {
  return "DATABASE_URL is missing at runtime. Set it as a Cloudflare Worker secret (Settings → Variables and Secrets), not only a build variable, then redeploy.";
}

export function registerFailureMessage(error: unknown) {
  if (isMissingRuntimeDatabaseUrl()) {
    return missingRuntimeDatabaseUrlMessage();
  }
  const log = safeErrorLog(error);
  const blob = `${log.name} ${log.code ?? ""} ${log.message}`.toLowerCase();
  if (log.message.includes("DATABASE_URL must be a postgresql")) {
    return missingRuntimeDatabaseUrlMessage();
  }
  if (log.code === "P2002" || blob.includes("unique constraint")) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (log.code === "P2021" || blob.includes("does not exist") || blob.includes("no such table")) {
    return "Database tables are missing. From a laptop run npm run db:push:prod against your Neon URL.";
  }
  if (blob.includes("channel_binding")) {
    return "Neon rejected the connection (channel_binding). Redeploy this build, or remove channel_binding=require from the Worker DATABASE_URL secret.";
  }
  if (blob.includes("transactions are not supported")) {
    return "Neon HTTP cannot run this write as a transaction. Redeploy this build (creates are single statements).";
  }
  const detail = [log.name, log.code].filter(Boolean).join(" ");
  return `Couldn’t create that account (${detail || "database error"}). Check Worker logs.`;
}
