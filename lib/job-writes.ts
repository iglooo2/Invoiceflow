import type { PrismaClient } from "@prisma/client";
import type { JobVisitInput } from "./jobs";

export type JobWriteInput = {
  userId: string;
  clientId?: string | null;
  title: string;
  jobNumber: string;
  address?: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  notes?: string | null;
};

function jobScalars(input: JobWriteInput, now: Date) {
  return {
    userId: input.userId,
    clientId: input.clientId ?? null,
    title: input.title,
    jobNumber: input.jobNumber,
    address: input.address ?? null,
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status,
    notes: input.notes ?? null,
    updatedAt: now,
  };
}

async function insertEstimates(db: PrismaClient, jobId: string, estimateIds: string[]) {
  for (const estimateId of estimateIds) {
    await db.jobEstimate.create({
      data: {
        id: crypto.randomUUID(),
        jobId,
        estimateId,
      },
    });
  }
}

async function insertInvoices(db: PrismaClient, jobId: string, invoiceIds: string[]) {
  for (const invoiceId of invoiceIds) {
    await db.jobInvoice.create({
      data: {
        id: crypto.randomUUID(),
        jobId,
        invoiceId,
      },
    });
  }
}

async function insertVisits(db: PrismaClient, jobId: string, visits: JobVisitInput[]) {
  for (const visit of visits) {
    await db.jobVisit.create({
      data: {
        id: crypto.randomUUID(),
        jobId,
        notes: visit.notes,
        scheduledAt: visit.scheduledAt ? new Date(visit.scheduledAt) : null,
      },
    });
  }
}

export async function insertJobWithRelations(
  db: PrismaClient,
  input: JobWriteInput,
  relations: { estimateIds: string[]; invoiceIds: string[]; visits: JobVisitInput[] },
) {
  const now = new Date();
  const id = crypto.randomUUID();
  const job = await db.job.create({
    data: {
      id,
      ...jobScalars(input, now),
      createdAt: now,
    },
  });
  try {
    await insertEstimates(db, job.id, relations.estimateIds);
    await insertInvoices(db, job.id, relations.invoiceIds);
    await insertVisits(db, job.id, relations.visits);
  } catch (error) {
    await db.job.delete({ where: { id: job.id } }).catch(() => undefined);
    throw error;
  }
  return job;
}

export async function replaceJobRelations(
  db: PrismaClient,
  jobId: string,
  input: Omit<JobWriteInput, "userId" | "jobNumber">,
  relations: { estimateIds: string[]; invoiceIds: string[]; visits: JobVisitInput[] },
) {
  const now = new Date();
  await db.job.update({
    where: { id: jobId },
    data: {
      clientId: input.clientId ?? null,
      title: input.title,
      address: input.address ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status,
      notes: input.notes ?? null,
      updatedAt: now,
    },
  });
  await db.jobEstimate.deleteMany({ where: { jobId } });
  await db.jobInvoice.deleteMany({ where: { jobId } });
  await db.jobVisit.deleteMany({ where: { jobId } });
  await insertEstimates(db, jobId, relations.estimateIds);
  await insertInvoices(db, jobId, relations.invoiceIds);
  await insertVisits(db, jobId, relations.visits);
}
