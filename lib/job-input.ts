import { z } from "zod";
import { JOB_STATUSES, parseJsonIdList, parseVisitsJson, type JobVisitInput } from "./jobs";

const jobSchema = z.object({
  title: z.string().trim().min(1, "Job title is required."),
  clientId: z.string().optional(),
  address: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(JOB_STATUSES),
  estimateIds: z.array(z.string().min(1)),
  invoiceIds: z.array(z.string().min(1)),
  visits: z.array(
    z.object({
      notes: z.string(),
      scheduledAt: z.string().optional(),
    }),
  ),
});

export type ParsedJobForm = z.infer<typeof jobSchema>;

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function completedToStatus(value: FormDataEntryValue | null): (typeof JOB_STATUSES)[number] {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "complete" || raw === "on" || raw === "true" || raw === "1") return "complete";
  return "active";
}

export function parseJobIdForm(formData: FormData): ParseResult<{ jobId: string }> {
  const jobId = String(formData.get("jobId") || "").trim();
  if (!jobId) return { success: false, error: "Job is missing." };
  return { success: true, data: { jobId } };
}

export function parseJobForm(formData: FormData): ParseResult<ParsedJobForm> {
  const parsed = jobSchema.safeParse({
    title: String(formData.get("title") || ""),
    clientId: optionalText(formData.get("clientId")),
    address: optionalText(formData.get("address")),
    startDate: optionalText(formData.get("startDate")),
    endDate: optionalText(formData.get("endDate")),
    notes: optionalText(formData.get("notes")),
    status: completedToStatus(formData.get("completed") ?? formData.get("status")),
    estimateIds: parseJsonIdList(formData.get("estimateIdsJson")),
    invoiceIds: parseJsonIdList(formData.get("invoiceIdsJson")),
    visits: parseVisitsJson(formData.get("visitsJson")),
  });
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  return { success: true, data: parsed.data };
}

export type { JobVisitInput };
