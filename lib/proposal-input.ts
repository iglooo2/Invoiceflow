import { z } from "zod";
import { dollarsFromInput } from "./money";

const sectionSchema = z.object({
  heading: z.string().trim().min(1, "Each section needs a heading."),
  body: z.string().trim().min(1, "Each section needs details."),
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
  status: z.enum(["draft", "sent", "accepted", "declined"]),
  sections: z.array(sectionSchema).min(1, "Add at least one section."),
});

export type ParsedProposalForm = z.infer<typeof proposalSchema>;

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export function parseProposalForm(formData: FormData): ParseResult<ParsedProposalForm> {
  const raw = formData.get("sectionsJson");
  let sectionsRaw: unknown = [];
  if (raw) {
    try {
      sectionsRaw = JSON.parse(String(raw));
    } catch {
      return { success: false, error: "Sections were invalid. Add them again and save." };
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
    sections,
  });
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) };
  }
  return { success: true, data: parsed.data };
}
