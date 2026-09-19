import { format } from "date-fns";

export const ESTIMATE_LIST_PATH = "/dashboard/estimates";
export const ESTIMATE_NEW_PATH = "/dashboard/estimates/new";
export const ESTIMATE_MARKETING_PATH = "/estimates";

export function estimateDetailPath(id: string) {
  return `/dashboard/estimates/${id}`;
}

export function estimateEditPath(id: string) {
  return `/dashboard/estimates/${id}/edit`;
}

export function estimateStatusLabel(status: string) {
  if (status === "accepted") return "approved";
  return status;
}

export type EstimateAttachment = {
  name: string;
  note?: string;
};

export function parseAttachmentsJson(raw: string | null | undefined): EstimateAttachment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const row = item as { name?: unknown; note?: unknown };
        const name = String(row?.name ?? "").trim();
        const note = String(row?.note ?? "").trim();
        return note ? { name, note } : { name };
      })
      .filter((item) => item.name.length > 0)
      .slice(0, 12);
  } catch {
    return [];
  }
}

export function formatEstimateDate(value: Date | string | null | undefined, pattern: string) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, pattern);
}

export function serializeAttachments(items: EstimateAttachment[]) {
  return JSON.stringify(
    items
      .map((item) => ({
        name: item.name.trim(),
        note: item.note?.trim() || undefined,
      }))
      .filter((item) => item.name.length > 0)
      .slice(0, 12),
  );
}
