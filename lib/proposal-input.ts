import { z } from "zod";
import { ESTIMATE_STATUSES, parseAttachmentsJson, serializeAttachments } from "./estimates";
import { dollarsFromInput } from "./money";

const sectionSchema = z.object({
  heading: z.string().trim().min(1, "Each line item needs a name."),
  body: z.string().trim().min(1, "Each line item needs details."),
  amount: z.number().nullable(),
});

const proposalSchema = z.object({
  clientId: z.string().optional(),
  title: z.string().trim().min(1, "Title is required."),
  clientName: z.string().trim().min(1, "Client name is required."),
  clientEmail: z.string().optional(),
  clientCompany: z.string().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(ESTIMATE_STATUSES),
  taxRate: z.number().min(0).max(100),
  markupRate: z.number().min(0).max(100),
  attachments: z.string().optional(),
  sections: z.array(sectionSchema).min(1, "Add at least one line item."),
});

export type ParsedProposalForm = z.infer<typeof proposalSchema>;

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export function parseProposalIdForm(formData: FormData): ParseResult<{ proposalId: string }> {
  const proposalId = String(formData.get("proposalId") || "").trim();
  if (!proposalId) return { success: false, error: "Estimate is missing." };
  return { success: true, data: { proposalId } };
}

export function parseProposalDecisionForm(
  formData: FormData,
): ParseResult<{ token: string; decision: "accepted" | "declined"; signedName?: string }> {
  const token = String(formData.get("token") || "").trim();
  const decision = String(formData.get("decision") || "").trim();
  const signedName = String(formData.get("signedName") || "").trim();
  if (!token) return { success: false, error: "Estimate link is missing." };
  if (decision !== "accepted" && decision !== "declined") {
    return { success: false, error: "Choose approve or decline." };
  }
  if (decision === "accepted" && signedName.length < 2) {
    return { success: false, error: "Type your name to approve this estimate." };
  }
  return { success: true, data: { token, decision, signedName: signedName || undefined } };
}

export function parseProposalStatusForm(
  formData: FormData,
): ParseResult<{ proposalId: string; status: ParsedProposalForm["status"] }> {
  const id = parseProposalIdForm(formData);
  if (!id.success) return id;
  const parsed = proposalSchema.shape.status.safeParse(String(formData.get("status") || "").trim());
  if (!parsed.success) return { success: false, error: "That estimate status is not valid." };
  return { success: true, data: { proposalId: id.data.proposalId, status: parsed.data } };
}

export function parseProposalForm(formData: FormData): ParseResult<ParsedProposalForm> {
  const raw = formData.get("sectionsJson");
  let sectionsRaw: unknown = [];
  if (raw) {
    try {
      sectionsRaw = JSON.parse(String(raw));
    } catch {
      return { success: false, error: "Line items were invalid. Add them again and save." };
    }
  }
  const sections = (Array.isArray(sectionsRaw) ? sectionsRaw : [])
    .map((section) => {
      const row = section as { heading?: string; body?: string; amount?: string };
      return {
        heading: String(row.heading ?? ""),
        body: String(row.body ?? ""),
        amount: row.amount === "" || row.amount == null ? null : dollarsFromInput(row.amount),
      };
    })
    .filter((section) => section.heading.trim().length > 0 || section.body.trim().length > 0);

  const parsed = proposalSchema.safeParse({
    clientId: String(formData.get("clientId") || "") || undefined,
    title: String(formData.get("title") || ""),
    clientName: String(formData.get("clientName") || ""),
    clientEmail: String(formData.get("clientEmail") || "") || undefined,
    clientCompany: String(formData.get("clientCompany") || "") || undefined,
    validUntil: String(formData.get("validUntil") || "") || undefined,
    notes: String(formData.get("notes") || "") || undefined,
    status: String(formData.get("status") || "draft"),
    taxRate: dollarsFromInput(String(formData.get("taxRate") || "0")),
    markupRate: dollarsFromInput(String(formData.get("markupRate") || "0")),
    attachments: serializeAttachments(parseAttachmentsJson(String(formData.get("attachmentsJson") || "[]"))),
    sections,
  });
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) };
  }
  return { success: true, data: parsed.data };
}
