import { format } from "date-fns";

export const JOB_LIST_PATH = "/dashboard/jobs";
export const JOB_NEW_PATH = "/dashboard/jobs/new";

export const JOB_STATUSES = ["active", "complete"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_SCHEMA_WARNING =
  "Postgres is missing Jobs tables (Job, JobEstimate, JobInvoice, JobVisit). From a laptop, against the Neon direct/unpooled URL (not *-pooler.*): npm run db:push:prod";

export function jobDetailPath(id: string) {
  return `/dashboard/jobs/${id}`;
}

export function isJobStatus(value: string | undefined | null): value is JobStatus {
  return JOB_STATUSES.includes(value as JobStatus);
}

export function parseJobStatus(value: string | undefined | null): JobStatus {
  return isJobStatus(value) ? value : "active";
}

/** Job numbers are assigned in JS so we never need Prisma `startsWith` on Workers. */
export function nextJobNumberFromExisting(numbers: Iterable<string>, at = new Date()) {
  const year = at.getFullYear();
  const prefix = `JOB-${year}-`;
  let max = 0;
  for (const number of numbers) {
    if (!number.startsWith(prefix)) continue;
    const parsed = Number.parseInt(number.slice(prefix.length), 10);
    if (Number.isFinite(parsed) && parsed > max) max = parsed;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function formatJobDate(value: Date | string | null | undefined, pattern = "MMM d") {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, pattern);
}

export function formatJobDateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
) {
  const from = formatJobDate(start, "MMM d");
  const to = formatJobDate(end, "MMM d");
  if (from && to) return `${from} – ${to}`;
  return from || to || "";
}

export function dateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
}

export type JobVisitInput = {
  notes: string;
  scheduledAt?: string;
};

export function parseJsonIdList(raw: unknown): string[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function parseVisitsJson(raw: unknown): JobVisitInput[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const row = item as { notes?: unknown; scheduledAt?: unknown };
        return {
          notes: String(row?.notes ?? "").trim(),
          scheduledAt: String(row?.scheduledAt ?? "").trim() || undefined,
        };
      })
      .filter((visit) => visit.notes || visit.scheduledAt)
      .slice(0, 24);
  } catch {
    return [];
  }
}
