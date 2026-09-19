import type { PrismaClient } from "@prisma/client";
import { prismaReadFailureMessage, isMissingDatabaseSchemaError, safeErrorLog } from "./db-errors";

/**
 * Proposal columns added for Estimates (PR #23). Prisma's default findMany
 * SELECTs every scalar, so a production DB that never ran `db:push:prod`
 * throws P2022 / "column does not exist" and Cloudflare renders the generic
 * Worker error page. These helpers retry without the new columns so the
 * dashboard still loads.
 */
export const ESTIMATE_OPTIONAL_COLUMNS = [
  "taxRate",
  "markupRate",
  "viewedAt",
  "signedName",
  "signedAt",
  "attachments",
] as const;

export const ESTIMATE_SCHEMA_WARNING =
  "Postgres is missing Estimates columns (taxRate, markupRate, viewedAt, signedName, signedAt, attachments). Older Proposal rows still loaded. From a laptop, against the Neon direct/unpooled URL (not *-pooler.*): npm run db:push:prod";

export type EstimateSectionRow = {
  heading: string;
  body: string;
  amount: number | null;
};

export type LoadedEstimate = {
  id: string;
  userId: string;
  clientId: string | null;
  title: string;
  status: string;
  validUntil: Date | null;
  notes: string | null;
  currency: string;
  publicToken: string;
  clientName: string;
  clientEmail: string | null;
  clientCompany: string | null;
  createdAt: Date;
  updatedAt?: Date;
  taxRate: number;
  markupRate: number;
  viewedAt: Date | null;
  signedName: string | null;
  signedAt: Date | null;
  attachments: string | null;
  sections: EstimateSectionRow[];
  user?: Record<string, unknown>;
};

export type ListEstimatesResult = {
  estimates: LoadedEstimate[];
  usedLegacySchema: boolean;
  error?: string;
};

export type FindEstimateResult = {
  estimate: LoadedEstimate | null;
  usedLegacySchema: boolean;
  error?: string;
};

const PROPOSAL_CORE_SELECT = {
  id: true,
  userId: true,
  clientId: true,
  title: true,
  status: true,
  validUntil: true,
  notes: true,
  currency: true,
  publicToken: true,
  clientName: true,
  clientEmail: true,
  clientCompany: true,
  createdAt: true,
  updatedAt: true,
};

const PROPOSAL_ESTIMATE_SELECT = {
  taxRate: true,
  markupRate: true,
  viewedAt: true,
  signedName: true,
  signedAt: true,
  attachments: true,
};

const SECTIONS_SELECT = {
  orderBy: { sortOrder: "asc" as const },
};

export type EstimateQueryOptions = {
  includeSections?: boolean;
  includeUser?: boolean;
  take?: number;
};

function proposalSelect(kind: "full" | "legacy", options: EstimateQueryOptions) {
  return {
    ...PROPOSAL_CORE_SELECT,
    ...(kind === "full" ? PROPOSAL_ESTIMATE_SELECT : {}),
    ...(options.includeSections ? { sections: SECTIONS_SELECT } : {}),
    ...(options.includeUser ? { user: true } : {}),
  };
}

function listWhere(userId: string, status?: string, q?: string) {
  return {
    userId,
    status: status || undefined,
    OR: q ? [{ title: { contains: q } }, { clientName: { contains: q } }] : undefined,
  };
}

async function withSchemaFallback<T>(full: () => Promise<T>, legacy: () => Promise<T>) {
  try {
    return { data: await full(), usedLegacySchema: false };
  } catch (error) {
    if (!isMissingDatabaseSchemaError(error)) throw error;
    return { data: await legacy(), usedLegacySchema: true };
  }
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asSections(value: unknown): EstimateSectionRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = (item ?? {}) as { heading?: unknown; body?: unknown; amount?: unknown };
    return {
      heading: asString(row.heading),
      body: asString(row.body),
      amount: typeof row.amount === "number" && Number.isFinite(row.amount) ? row.amount : null,
    };
  });
}

export function normalizeEstimate(row: unknown): LoadedEstimate {
  const record = (row ?? {}) as Record<string, unknown>;
  return {
    id: asString(record.id),
    userId: asString(record.userId),
    clientId: typeof record.clientId === "string" ? record.clientId : null,
    title: asString(record.title),
    status: asString(record.status, "draft"),
    validUntil: asDate(record.validUntil),
    notes: typeof record.notes === "string" ? record.notes : null,
    currency: asString(record.currency, "USD") || "USD",
    publicToken: asString(record.publicToken),
    clientName: asString(record.clientName),
    clientEmail: typeof record.clientEmail === "string" ? record.clientEmail : null,
    clientCompany: typeof record.clientCompany === "string" ? record.clientCompany : null,
    createdAt: asDate(record.createdAt) ?? new Date(0),
    updatedAt: asDate(record.updatedAt) ?? undefined,
    taxRate: asNumber(record.taxRate, 0),
    markupRate: asNumber(record.markupRate, 0),
    viewedAt: asDate(record.viewedAt),
    signedName: typeof record.signedName === "string" ? record.signedName : null,
    signedAt: asDate(record.signedAt),
    attachments: typeof record.attachments === "string" ? record.attachments : null,
    sections: asSections(record.sections),
    user: record.user && typeof record.user === "object" ? (record.user as Record<string, unknown>) : undefined,
  };
}

export async function listEstimatesForUser(
  db: PrismaClient,
  options: { userId: string; status?: string; q?: string } & EstimateQueryOptions,
): Promise<ListEstimatesResult> {
  const { userId, status, q, take, includeSections = true } = options;
  const where = listWhere(userId, status, q);
  try {
    const queried = await withSchemaFallback(
      () =>
        db.proposal.findMany({
          where,
          select: proposalSelect("full", { includeSections }),
          orderBy: { createdAt: "desc" },
          take,
        } as never) as Promise<unknown[]>,
      () =>
        db.proposal.findMany({
          where,
          select: proposalSelect("legacy", { includeSections }),
          orderBy: { createdAt: "desc" },
          take,
        } as never) as Promise<unknown[]>,
    );
    return {
      estimates: queried.data.map(normalizeEstimate),
      usedLegacySchema: queried.usedLegacySchema,
    };
  } catch (error) {
    console.error("listEstimatesForUser", safeErrorLog(error));
    return {
      estimates: [],
      usedLegacySchema: false,
      error: prismaReadFailureMessage(error),
    };
  }
}

export async function findEstimateForUser(
  db: PrismaClient,
  userId: string,
  id: string,
  options: EstimateQueryOptions = { includeSections: true },
): Promise<FindEstimateResult> {
  try {
    const queried = await withSchemaFallback(
      () =>
        db.proposal.findFirst({
          where: { id, userId },
          select: proposalSelect("full", options),
        } as never) as Promise<unknown>,
      () =>
        db.proposal.findFirst({
          where: { id, userId },
          select: proposalSelect("legacy", options),
        } as never) as Promise<unknown>,
    );
    return {
      estimate: queried.data ? normalizeEstimate(queried.data) : null,
      usedLegacySchema: queried.usedLegacySchema,
    };
  } catch (error) {
    console.error("findEstimateForUser", safeErrorLog(error));
    return {
      estimate: null,
      usedLegacySchema: false,
      error: prismaReadFailureMessage(error),
    };
  }
}

export async function findEstimateByPublicToken(
  db: PrismaClient,
  token: string,
  options: EstimateQueryOptions = { includeSections: true, includeUser: true },
): Promise<FindEstimateResult> {
  try {
    const queried = await withSchemaFallback(
      () =>
        db.proposal.findUnique({
          where: { publicToken: token },
          select: proposalSelect("full", options),
        } as never) as Promise<unknown>,
      () =>
        db.proposal.findUnique({
          where: { publicToken: token },
          select: proposalSelect("legacy", options),
        } as never) as Promise<unknown>,
    );
    return {
      estimate: queried.data ? normalizeEstimate(queried.data) : null,
      usedLegacySchema: queried.usedLegacySchema,
    };
  } catch (error) {
    console.error("findEstimateByPublicToken", safeErrorLog(error));
    return {
      estimate: null,
      usedLegacySchema: false,
      error: prismaReadFailureMessage(error),
    };
  }
}

export async function findEstimateById(
  db: PrismaClient,
  id: string,
  options: EstimateQueryOptions = { includeSections: true, includeUser: true },
): Promise<FindEstimateResult> {
  try {
    const queried = await withSchemaFallback(
      () =>
        db.proposal.findUnique({
          where: { id },
          select: proposalSelect("full", options),
        } as never) as Promise<unknown>,
      () =>
        db.proposal.findUnique({
          where: { id },
          select: proposalSelect("legacy", options),
        } as never) as Promise<unknown>,
    );
    return {
      estimate: queried.data ? normalizeEstimate(queried.data) : null,
      usedLegacySchema: queried.usedLegacySchema,
    };
  } catch (error) {
    console.error("findEstimateById", safeErrorLog(error));
    return {
      estimate: null,
      usedLegacySchema: false,
      error: prismaReadFailureMessage(error),
    };
  }
}
