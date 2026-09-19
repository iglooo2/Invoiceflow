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

export type WriteFailureKind = "account" | "document";

export function prismaWriteFailureMessage(error: unknown, kind: WriteFailureKind = "document") {
  if (isMissingRuntimeDatabaseUrl()) {
    return missingRuntimeDatabaseUrlMessage();
  }
  const log = safeErrorLog(error);
  const blob = `${log.name} ${log.code ?? ""} ${log.message}`.toLowerCase();
  const issues = (error as { issues?: { message?: string }[] }).issues;
  if (log.name === "ZodError" && issues?.[0]?.message) {
    return issues[0].message;
  }
  if (log.message.includes("DATABASE_URL must be a postgresql")) {
    return missingRuntimeDatabaseUrlMessage();
  }
  if (log.code === "P2002" || blob.includes("unique constraint")) {
    if (kind === "account") {
      return "An account with that email already exists. Sign in instead.";
    }
    return "That document number or share link is already in use. Reload and try again.";
  }
  if (log.code === "P2003" || blob.includes("foreign key")) {
    return "That saved client is missing. Clear the saved client and type the name instead.";
  }
  if (isMissingDatabaseSchemaError(error)) {
    return missingDatabaseSchemaMessage();
  }
  if (log.code === "P1001" || log.code === "P1017" || blob.includes("can't reach database") || blob.includes("timed out")) {
    return "Couldn’t reach Neon (P1001). Check the Worker DATABASE_URL host (use the pooled -pooler URL) and that the compute is awake.";
  }
  if (log.code === "P1000" || blob.includes("authentication failed")) {
    return "Database authentication failed (P1000). Rotate the Worker DATABASE_URL secret from the Neon console.";
  }
  if (blob.includes("channel_binding")) {
    return "Neon rejected the connection (channel_binding). Redeploy this build, or remove channel_binding=require from the Worker DATABASE_URL secret.";
  }
  if (blob.includes("transactions are not supported")) {
    return "Neon HTTP cannot run this write as a transaction. Reload — this build saves invoices as separate statements. If it persists, check Worker logs.";
  }
  if (blob.includes("sqlite") || blob.includes("better-sqlite") || blob.includes("file:")) {
    return "This Worker was built with a SQLite Prisma client. Set PRISMA_PROVIDER=postgresql as a Cloudflare *build* variable and rebuild with npm run cf:build.";
  }
  const detail = [log.name, log.code].filter(Boolean).join(" ");
  if (kind === "account") {
    return `Couldn’t create that account (${detail || "database error"}). Check Worker logs.`;
  }
  return `Couldn’t save that document (${detail || "database error"}). Check Worker logs.`;
}

export function registerFailureMessage(error: unknown) {
  return prismaWriteFailureMessage(error, "account");
}

export function documentWriteFailureMessage(error: unknown) {
  return prismaWriteFailureMessage(error, "document");
}

export function missingDatabaseSchemaMessage() {
  return "Database tables are missing or out of date. From a laptop run npm run db:push:prod against your Neon URL.";
}

export function isMissingDatabaseSchemaError(error: unknown) {
  const log = safeErrorLog(error);
  const blob = `${log.name} ${log.code ?? ""} ${log.message}`.toLowerCase();
  return (
    log.code === "P2021" ||
    log.code === "P2022" ||
    blob.includes("does not exist") ||
    blob.includes("no such table") ||
    blob.includes("undefined_column") ||
    blob.includes("42703")
  );
}

export function prismaReadFailureMessage(error: unknown) {
  if (isMissingRuntimeDatabaseUrl()) {
    return missingRuntimeDatabaseUrlMessage();
  }
  const log = safeErrorLog(error);
  const blob = `${log.name} ${log.code ?? ""} ${log.message}`.toLowerCase();
  if (log.message.includes("DATABASE_URL must be a postgresql")) {
    return missingRuntimeDatabaseUrlMessage();
  }
  if (isMissingDatabaseSchemaError(error)) {
    return missingDatabaseSchemaMessage();
  }
  if (log.code === "P1001" || log.code === "P1017" || blob.includes("can't reach database") || blob.includes("timed out")) {
    return "Couldn’t reach Neon (P1001). Check the Worker DATABASE_URL host (use the pooled -pooler URL) and that the compute is awake.";
  }
  if (log.code === "P1000" || blob.includes("authentication failed")) {
    return "Database authentication failed (P1000). Rotate the Worker DATABASE_URL secret from the Neon console.";
  }
  if (blob.includes("channel_binding")) {
    return "Neon rejected the connection (channel_binding). Redeploy this build, or remove channel_binding=require from the Worker DATABASE_URL secret.";
  }
  if (blob.includes("transactions are not supported")) {
    return "Neon HTTP cannot run this read as a transaction. Reload — this build loads estimates without wrapping the query in $transaction.";
  }
  if (blob.includes("sqlite") || blob.includes("better-sqlite") || blob.includes("file:")) {
    return "This Worker was built with a SQLite Prisma client. Set PRISMA_PROVIDER=postgresql as a Cloudflare *build* variable and rebuild with npm run cf:build.";
  }
  const detail = [log.name, log.code].filter(Boolean).join(" ");
  return `Couldn’t load estimates (${detail || "database error"}). Check Worker logs, or from a laptop run npm run db:push:prod.`;
}

export function errorRedirect(path: string, message: string) {
  const params = new URLSearchParams({ error: message.slice(0, 280) });
  return `${path}?${params.toString()}`;
}
