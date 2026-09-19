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

const statusLabels: Record<string, string> = {
  accepted: "approved",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={invoiceTones[status] ?? "muted"}>{statusLabels[status] ?? status}</Badge>;
}
