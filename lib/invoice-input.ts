import { z } from "zod";
import { dollarsFromInput } from "./money";

const itemSchema = z.object({
  description: z.string().trim().min(1, "Each line item needs a description."),
  quantity: z.number().refine((value) => value > 0, "Quantity must be greater than 0."),
  rate: z.number().refine((value) => Number.isFinite(value), "Rate must be a number."),
});

const invoiceSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().trim().min(1, "Client name is required."),
  clientEmail: z.string().optional(),
  clientCompany: z.string().optional(),
  clientAddress: z.string().optional(),
  issueDate: z.string().min(1, "Issue date is required."),
  dueDate: z.string().optional(),
  taxRate: z.number().min(0, "Tax % can’t be negative.").max(100, "Tax % can’t exceed 100."),
  notes: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "void"]),
  items: z.array(itemSchema).min(1, "Add at least one line item with a description."),
});

export type ParsedInvoiceForm = z.infer<typeof invoiceSchema>;

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

function parseJsonField(raw: FormDataEntryValue | null, label: string): ParseResult<unknown> {
  if (raw == null || raw === "") return { success: true, data: [] };
  try {
    return { success: true, data: JSON.parse(String(raw)) };
  } catch {
    return { success: false, error: `${label} were invalid. Add them again and save.` };
  }
}

export function parseInvoiceIdForm(formData: FormData): ParseResult<{ invoiceId: string }> {
  const invoiceId = String(formData.get("invoiceId") || "").trim();
  if (!invoiceId) return { success: false, error: "Invoice is missing." };
  return { success: true, data: { invoiceId } };
}

export function parseInvoiceStatusForm(
  formData: FormData,
): ParseResult<{ invoiceId: string; status: ParsedInvoiceForm["status"] }> {
  const id = parseInvoiceIdForm(formData);
  if (!id.success) return id;
  const parsed = invoiceSchema.shape.status.safeParse(String(formData.get("status") || "").trim());
  if (!parsed.success) return { success: false, error: "That invoice status is not valid." };
  return { success: true, data: { invoiceId: id.data.invoiceId, status: parsed.data } };
}

export function parseInvoiceForm(formData: FormData): ParseResult<ParsedInvoiceForm> {
  const json = parseJsonField(formData.get("itemsJson"), "Line items");
  if (!json.success) return json;
  const rawItems = Array.isArray(json.data) ? json.data : [];
  const items = rawItems
    .map((item) => {
      const row = item as { description?: string; quantity?: string; rate?: string };
      return {
        description: String(row.description ?? ""),
        quantity: dollarsFromInput(row.quantity),
        rate: dollarsFromInput(row.rate),
      };
    })
    .filter((item) => item.description.trim().length > 0);

  const parsed = invoiceSchema.safeParse({
    clientId: String(formData.get("clientId") || "") || undefined,
    clientName: String(formData.get("clientName") || ""),
    clientEmail: String(formData.get("clientEmail") || "") || undefined,
    clientCompany: String(formData.get("clientCompany") || "") || undefined,
    clientAddress: String(formData.get("clientAddress") || "") || undefined,
    issueDate: String(formData.get("issueDate") || ""),
    dueDate: String(formData.get("dueDate") || "") || undefined,
    taxRate: dollarsFromInput(formData.get("taxRate") as string),
    notes: String(formData.get("notes") || "") || undefined,
    status: String(formData.get("status") || "draft"),
    items,
  });
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) };
  }
  return { success: true, data: parsed.data };
}
