import { Badge } from "@/components/ui/card";

const invoiceTones: Record<string, "muted" | "primary" | "accent" | "success" | "danger"> = {
  draft: "muted",
  sent: "primary",
  paid: "success",
  overdue: "danger",
  void: "muted",
  accepted: "success",
  declined: "danger",
};

export function StatusBadge({
  status,
  labels,
}: {
  status: string;
  labels?: Record<string, string>;
}) {
  return <Badge tone={invoiceTones[status] ?? "muted"}>{labels?.[status] ?? status}</Badge>;
}
