import { estimateTotals, invoiceTotals } from "./money";
import type { LoadedEstimate } from "./proposal-queries";

export type ListFilters = {
  status?: string;
  q?: string;
};

export function parseListFilters(
  input: { status?: string | null; q?: string | null } | URLSearchParams,
): ListFilters {
  const status = input instanceof URLSearchParams ? input.get("status") : input.status;
  const q = input instanceof URLSearchParams ? input.get("q") : input.q;
  return {
    status: status?.trim() || undefined,
    q: q?.trim() || undefined,
  };
}

export function csvExportHref(kind: "invoices" | "estimates", filters: ListFilters) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  const query = params.toString();
  return query ? `/api/${kind}/csv?${query}` : `/api/${kind}/csv`;
}

export function invoiceListWhere(userId: string, filters: ListFilters) {
  return {
    userId,
    status: filters.status,
    OR: filters.q
      ? [
          { number: { contains: filters.q } },
          { clientName: { contains: filters.q } },
          { clientCompany: { contains: filters.q } },
        ]
      : undefined,
  };
}

export function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const raw = String(value);
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function toCsv(headers: readonly string[], rows: Array<Array<string | number | null | undefined>>) {
  const lines = [
    headers.map(escapeCsvField).join(","),
    ...rows.map((row) => row.map(escapeCsvField).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function csvDateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function csvIsoDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function csvMoney(cents: number) {
  return (cents / 100).toFixed(2);
}

export function invoicesExportFilename(date = new Date()) {
  return `invoices-${csvDateStamp(date)}.csv`;
}

export function estimatesExportFilename(date = new Date()) {
  return `estimates-${csvDateStamp(date)}.csv`;
}

export function csvDownloadHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
  };
}

export const INVOICE_CSV_HEADERS = [
  "number",
  "id",
  "client_name",
  "client_email",
  "client_company",
  "status",
  "issue_date",
  "due_date",
  "po_number",
  "subtotal",
  "tax",
  "total",
  "currency",
] as const;

export const ESTIMATE_CSV_HEADERS = [
  "id",
  "title",
  "client_name",
  "client_email",
  "client_company",
  "status",
  "created_at",
  "valid_until",
  "viewed_at",
  "signed_name",
  "signed_at",
  "subtotal",
  "markup",
  "tax",
  "total",
  "currency",
] as const;

export type InvoiceCsvSource = {
  id: string;
  number: string;
  clientName: string;
  clientEmail?: string | null;
  clientCompany?: string | null;
  status: string;
  issueDate: Date;
  dueDate?: Date | null;
  poNumber?: string | null;
  taxRate: number;
  currency: string;
  items: { quantity: number; rate: number }[];
};

export function invoiceCsvRow(invoice: InvoiceCsvSource) {
  const totals = invoiceTotals(invoice.items, invoice.taxRate);
  return [
    invoice.number,
    invoice.id,
    invoice.clientName,
    invoice.clientEmail ?? "",
    invoice.clientCompany ?? "",
    invoice.status,
    csvIsoDate(invoice.issueDate),
    csvIsoDate(invoice.dueDate),
    invoice.poNumber ?? "",
    csvMoney(totals.subtotalCents),
    csvMoney(totals.taxCents),
    csvMoney(totals.totalCents),
    invoice.currency,
  ];
}

export function estimateCsvRow(estimate: LoadedEstimate) {
  const totals = estimateTotals(estimate.sections, estimate.taxRate, estimate.markupRate);
  return [
    estimate.id,
    estimate.title,
    estimate.clientName,
    estimate.clientEmail ?? "",
    estimate.clientCompany ?? "",
    estimate.status,
    csvIsoDate(estimate.createdAt),
    csvIsoDate(estimate.validUntil),
    csvIsoDate(estimate.viewedAt),
    estimate.signedName ?? "",
    csvIsoDate(estimate.signedAt),
    csvMoney(totals.subtotalCents),
    csvMoney(totals.markupCents),
    csvMoney(totals.taxCents),
    csvMoney(totals.totalCents),
    estimate.currency,
  ];
}

export function invoicesToCsv(invoices: InvoiceCsvSource[]) {
  return toCsv(INVOICE_CSV_HEADERS, invoices.map(invoiceCsvRow));
}

export function estimatesToCsv(estimates: LoadedEstimate[]) {
  return toCsv(ESTIMATE_CSV_HEADERS, estimates.map(estimateCsvRow));
}
