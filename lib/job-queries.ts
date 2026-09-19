import type { PrismaClient } from "@prisma/client";
import { isMissingDatabaseSchemaError, prismaReadFailureMessage, safeErrorLog } from "./db-errors";
import { JOB_SCHEMA_WARNING, parseJobStatus, type JobStatus } from "./jobs";

export type LoadedJobVisit = {
  id: string;
  notes: string;
  scheduledAt: Date | null;
};

export type LoadedJobEstimate = {
  id: string;
  estimateId: string;
  title: string;
  clientName: string;
  status: string;
};

export type LoadedJobInvoice = {
  id: string;
  invoiceId: string;
  number: string;
  clientName: string;
  status: string;
};

export type LoadedJob = {
  id: string;
  userId: string;
  clientId: string | null;
  title: string;
  jobNumber: string;
  address: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: JobStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  clientName: string | null;
  clientAddress: string | null;
  estimates: LoadedJobEstimate[];
  invoices: LoadedJobInvoice[];
  visits: LoadedJobVisit[];
};

export type ListJobsResult = {
  jobs: LoadedJob[];
  usedLegacySchema: boolean;
  error?: string;
  warning?: string;
};

export type FindJobResult = {
  job: LoadedJob | null;
  usedLegacySchema: boolean;
  error?: string;
  warning?: string;
};

const JOB_INCLUDE = {
  client: { select: { name: true, address: true } },
  estimates: {
    include: {
      estimate: { select: { id: true, title: true, clientName: true, status: true } },
    },
  },
  invoices: {
    include: {
      invoice: { select: { id: true, number: true, clientName: true, status: true } },
    },
  },
  visits: { orderBy: { createdAt: "asc" as const } },
};

type JobRow = {
  id: string;
  userId: string;
  clientId: string | null;
  title: string;
  jobNumber: string;
  address: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  client?: { name: string; address: string | null } | null;
  estimates?: Array<{
    id: string;
    estimateId: string;
    estimate?: { id: string; title: string; clientName: string; status: string } | null;
  }>;
  invoices?: Array<{
    id: string;
    invoiceId: string;
    invoice?: { id: string; number: string; clientName: string; status: string } | null;
  }>;
  visits?: Array<{ id: string; notes: string; scheduledAt: Date | null }>;
};

export function normalizeJob(row: JobRow): LoadedJob {
  return {
    id: row.id,
    userId: row.userId,
    clientId: row.clientId,
    title: row.title,
    jobNumber: row.jobNumber,
    address: row.address,
    startDate: row.startDate,
    endDate: row.endDate,
    status: parseJobStatus(row.status),
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    clientName: row.client?.name ?? null,
    clientAddress: row.client?.address ?? null,
    estimates: (row.estimates ?? []).map((link) => ({
      id: link.id,
      estimateId: link.estimateId,
      title: link.estimate?.title ?? "Estimate",
      clientName: link.estimate?.clientName ?? "",
      status: link.estimate?.status ?? "",
    })),
    invoices: (row.invoices ?? []).map((link) => ({
      id: link.id,
      invoiceId: link.invoiceId,
      number: link.invoice?.number ?? "Invoice",
      clientName: link.invoice?.clientName ?? "",
      status: link.invoice?.status ?? "",
    })),
    visits: (row.visits ?? []).map((visit) => ({
      id: visit.id,
      notes: visit.notes,
      scheduledAt: visit.scheduledAt,
    })),
  };
}

function searchClause(q: string) {
  const query = q.trim();
  if (!query) return undefined;
  return {
    OR: [
      { title: { contains: query } },
      { jobNumber: { contains: query } },
      { address: { contains: query } },
      { notes: { contains: query } },
      { client: { name: { contains: query } } },
      { client: { address: { contains: query } } },
      { client: { company: { contains: query } } },
    ],
  };
}

export async function listJobsForUser(
  db: PrismaClient,
  options: { userId: string; status?: string; q?: string; take?: number },
): Promise<ListJobsResult> {
  const status = options.status ? parseJobStatus(options.status) : undefined;
  try {
    const rows = await db.job.findMany({
      where: {
        userId: options.userId,
        ...(status ? { status } : {}),
        ...searchClause(options.q ?? ""),
      },
      include: JOB_INCLUDE,
      orderBy: { createdAt: "desc" },
      ...(options.take ? { take: options.take } : {}),
    });
    return { jobs: rows.map((row) => normalizeJob(row as JobRow)), usedLegacySchema: false };
  } catch (error) {
    console.error("listJobsForUser", safeErrorLog(error));
    if (isMissingDatabaseSchemaError(error)) {
      return {
        jobs: [],
        usedLegacySchema: true,
        warning: JOB_SCHEMA_WARNING,
      };
    }
    return { jobs: [], usedLegacySchema: false, error: prismaReadFailureMessage(error) };
  }
}

export async function findJobForUser(
  db: PrismaClient,
  options: { userId: string; jobId: string },
): Promise<FindJobResult> {
  try {
    const row = await db.job.findFirst({
      where: { id: options.jobId, userId: options.userId },
      include: JOB_INCLUDE,
    });
    return { job: row ? normalizeJob(row as JobRow) : null, usedLegacySchema: false };
  } catch (error) {
    console.error("findJobForUser", safeErrorLog(error));
    if (isMissingDatabaseSchemaError(error)) {
      return { job: null, usedLegacySchema: true, warning: JOB_SCHEMA_WARNING };
    }
    return { job: null, usedLegacySchema: false, error: prismaReadFailureMessage(error) };
  }
}

export async function listJobNumbersForUser(db: PrismaClient, userId: string): Promise<string[]> {
  try {
    const rows = await db.job.findMany({
      where: { userId },
      select: { jobNumber: true },
    });
    return rows.map((row) => row.jobNumber);
  } catch (error) {
    if (isMissingDatabaseSchemaError(error)) return [];
    throw error;
  }
}
