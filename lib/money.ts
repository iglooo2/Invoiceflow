export type MoneyBreakdown = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

export type EstimateMoneyBreakdown = MoneyBreakdown & {
  markupCents: number;
};

export function lineTotalCents(quantity: number, rateDollars: number) {
  if (!Number.isFinite(quantity) || !Number.isFinite(rateDollars)) return 0;
  return Math.round(quantity * rateDollars * 100);
}

export function invoiceTotals(
  items: { quantity: number; rate: number }[],
  taxRatePercent: number,
): MoneyBreakdown {
  const subtotalCents = items.reduce(
    (sum, item) => sum + lineTotalCents(item.quantity, item.rate),
    0,
  );
  const safeTax = Number.isFinite(taxRatePercent) ? Math.max(0, taxRatePercent) : 0;
  const taxCents = Math.round(subtotalCents * (safeTax / 100));
  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}

export function proposalTotalCents(sections: { amount?: number | null }[]) {
  return sections.reduce((sum, section) => {
    if (section.amount == null || !Number.isFinite(section.amount)) return sum;
    return sum + Math.round(section.amount * 100);
  }, 0);
}

export function estimateTotals(
  sections: { amount?: number | null }[],
  taxRatePercent = 0,
  markupRatePercent = 0,
): EstimateMoneyBreakdown {
  const subtotalCents = proposalTotalCents(sections);
  const safeMarkup = Number.isFinite(markupRatePercent) ? Math.max(0, markupRatePercent) : 0;
  const markupCents = Math.round(subtotalCents * (safeMarkup / 100));
  const afterMarkup = subtotalCents + markupCents;
  const safeTax = Number.isFinite(taxRatePercent) ? Math.max(0, taxRatePercent) : 0;
  const taxCents = Math.round(afterMarkup * (safeTax / 100));
  return {
    subtotalCents,
    markupCents,
    taxCents,
    totalCents: afterMarkup + taxCents,
  };
}

export function formatCents(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function dollarsFromInput(value: string | number | null | undefined) {
  if (value == null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
