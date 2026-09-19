import { Badge } from "@/components/ui/card";

const invoiceTones: Record<string, "muted" | "primary" | "accent" | "success" | "danger"> = {
  draft: "muted",
  sent: "primary",
  pending: "accent",
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
  const label =
    status === "accepted" && labels?.approved
      ? labels.approved
      : (labels?.[status] ?? status);
  return <Badge tone={invoiceTones[status] ?? "muted"}>{label}</Badge>;
}
