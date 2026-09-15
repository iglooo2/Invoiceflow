export const FREE_INVOICES_PER_MONTH = 3;
export const FREE_PROPOSALS_PER_MONTH = 3;
export const PRO_MONTHLY_PRICE = 24;

export type PlanId = "free" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  invoicesPerMonth: number | "unlimited";
  proposalsPerMonth: number | "unlimited";
  blurb: string;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Starter",
    monthlyPrice: 0,
    invoicesPerMonth: FREE_INVOICES_PER_MONTH,
    proposalsPerMonth: FREE_PROPOSALS_PER_MONTH,
    blurb: "Enough to stop sending ugly Word docs this month.",
    features: [
      `${FREE_INVOICES_PER_MONTH} invoices / month`,
      `${FREE_PROPOSALS_PER_MONTH} proposals / month`,
      "PDF download + shareable client links",
      "Studio templates",
      "InvoiceFlow mark on public pages",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPrice: PRO_MONTHLY_PRICE,
    invoicesPerMonth: "unlimited",
    proposalsPerMonth: "unlimited",
    blurb: "Unlimited invoices and proposals for a working studio.",
    features: [
      "Unlimited invoices & proposals",
      "PDF download + shareable client links",
      "Custom studio details on every document",
      "No InvoiceFlow mark on client views",
      "Stripe billing portal",
    ],
  },
};

export function isProPlan(user: {
  plan?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
}) {
  if (user.plan !== "pro") return false;
  if (!user.stripeCurrentPeriodEnd) return true;
  return user.stripeCurrentPeriodEnd.getTime() > Date.now() - 24 * 60 * 60 * 1000;
}

export function monthlyLimit(plan: PlanId, kind: "invoice" | "proposal") {
  if (plan === "pro") return Number.POSITIVE_INFINITY;
  return kind === "invoice" ? FREE_INVOICES_PER_MONTH : FREE_PROPOSALS_PER_MONTH;
}

export function canCreateDocument(params: {
  plan: PlanId;
  kind: "invoice" | "proposal";
  createdThisMonth: number;
}) {
  const limit = monthlyLimit(params.plan, params.kind);
  if (!Number.isFinite(limit)) return { ok: true as const, limit, remaining: Number.POSITIVE_INFINITY };
  const remaining = Math.max(0, limit - params.createdThisMonth);
  return {
    ok: remaining > 0,
    limit,
    remaining,
  };
}

export function currentPlanId(user: {
  plan?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
}): PlanId {
  return isProPlan(user) ? "pro" : "free";
}
