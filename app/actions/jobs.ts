"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { databaseRuntimeStatus, prisma } from "@/lib/db";
import { documentWriteFailureMessage, errorRedirect, isMissingDatabaseSchemaError, safeErrorLog } from "@/lib/db-errors";
import { parseJobForm, parseJobIdForm } from "@/lib/job-input";
import { listJobNumbersForUser } from "@/lib/job-queries";
import { insertJobWithRelations, replaceJobRelations } from "@/lib/job-writes";
import { JOB_LIST_PATH, JOB_SCHEMA_WARNING, jobDetailPath, nextJobNumberFromExisting } from "@/lib/jobs";
import { requireUser } from "@/lib/session";

export type JobActionResult = { error: string };

async function revalidateJobPaths(jobId?: string) {
  try {
    revalidatePath("/dashboard");
    revalidatePath(JOB_LIST_PATH);
    if (jobId) revalidatePath(jobDetailPath(jobId));
  } catch (error) {
    console.error("job revalidatePath", safeErrorLog(error));
  }
}

function parseOptionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function ownedEstimateIds(userId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await prisma.proposal.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  });
  const allowed = new Set(rows.map((row) => row.id));
  return ids.filter((id) => allowed.has(id));
}

async function ownedInvoiceIds(userId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await prisma.invoice.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  });
  const allowed = new Set(rows.map((row) => row.id));
  return ids.filter((id) => allowed.has(id));
}

async function ownedClientId(userId: string, clientId?: string) {
  if (!clientId) return null;
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    select: { id: true },
  });
  return client?.id ?? null;
}

export async function createJob(formData: FormData): Promise<JobActionResult | void> {
  const user = await requireUser();
  let jobId: string;
  try {
    const parsed = parseJobForm(formData);
    if (!parsed.success) return { error: parsed.error };
    const [estimateIds, invoiceIds, clientId, numbers] = await Promise.all([
      ownedEstimateIds(user.id, parsed.data.estimateIds),
      ownedInvoiceIds(user.id, parsed.data.invoiceIds),
      ownedClientId(user.id, parsed.data.clientId),
      listJobNumbersForUser(prisma, user.id),
    ]);
    const job = await insertJobWithRelations(
      prisma,
      {
        userId: user.id,
        clientId,
        title: parsed.data.title,
        jobNumber: nextJobNumberFromExisting(numbers),
        address: parsed.data.address ?? null,
        startDate: parseOptionalDate(parsed.data.startDate),
        endDate: parseOptionalDate(parsed.data.endDate),
        status: parsed.data.status,
        notes: parsed.data.notes ?? null,
      },
      { estimateIds, invoiceIds, visits: parsed.data.visits },
    );
    jobId = job.id;
  } catch (error) {
    unstable_rethrow(error);
    console.error("createJob failed", safeErrorLog(error), databaseRuntimeStatus());
    if (isMissingDatabaseSchemaError(error)) {
      return { error: JOB_SCHEMA_WARNING };
    }
    return { error: documentWriteFailureMessage(error) };
  }
  await revalidateJobPaths(jobId);
  redirect(jobDetailPath(jobId));
}

export async function updateJob(formData: FormData): Promise<JobActionResult | void> {
  const user = await requireUser();
  const id = parseJobIdForm(formData);
  if (!id.success) return { error: id.error };
  try {
    const parsed = parseJobForm(formData);
    if (!parsed.success) return { error: parsed.error };
    const existing = await prisma.job.findFirst({
      where: { id: id.data.jobId, userId: user.id },
      select: { id: true },
    });
    if (!existing) return { error: "Job not found." };
    const [estimateIds, invoiceIds, clientId] = await Promise.all([
      ownedEstimateIds(user.id, parsed.data.estimateIds),
      ownedInvoiceIds(user.id, parsed.data.invoiceIds),
      ownedClientId(user.id, parsed.data.clientId),
    ]);
    await replaceJobRelations(
      prisma,
      existing.id,
      {
        clientId,
        title: parsed.data.title,
        address: parsed.data.address ?? null,
        startDate: parseOptionalDate(parsed.data.startDate),
        endDate: parseOptionalDate(parsed.data.endDate),
        status: parsed.data.status,
        notes: parsed.data.notes ?? null,
      },
      { estimateIds, invoiceIds, visits: parsed.data.visits },
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("updateJob failed", safeErrorLog(error), databaseRuntimeStatus());
    if (isMissingDatabaseSchemaError(error)) {
      return { error: JOB_SCHEMA_WARNING };
    }
    return { error: documentWriteFailureMessage(error) };
  }
  await revalidateJobPaths(id.data.jobId);
  redirect(jobDetailPath(id.data.jobId));
}

export async function deleteJob(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = parseJobIdForm(formData);
  if (!id.success) {
    redirect(errorRedirect(JOB_LIST_PATH, id.error));
  }
  try {
    await prisma.job.deleteMany({ where: { id: id.data.jobId, userId: user.id } });
  } catch (error) {
    unstable_rethrow(error);
    console.error("deleteJob failed", safeErrorLog(error), databaseRuntimeStatus());
    const message = isMissingDatabaseSchemaError(error)
      ? JOB_SCHEMA_WARNING
      : documentWriteFailureMessage(error);
    redirect(errorRedirect(jobDetailPath(id.data.jobId), message));
  }
  await revalidateJobPaths();
  redirect(JOB_LIST_PATH);
}
