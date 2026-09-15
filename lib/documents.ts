import { nanoid } from "nanoid";
import { startOfMonth } from "date-fns";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { canCreateDocument, type PlanId } from "@/lib/plans";

export function newPublicToken() {
  return nanoid(12);
}

export async function nextInvoiceNumber(userId: string) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const latest = await prisma.invoice.findFirst({
    where: { userId, number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const last = latest?.number ? Number.parseInt(latest.number.replace(prefix, ""), 10) : 0;
  const next = Number.isFinite(last) ? last + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function countCreatedThisMonth(
  userId: string,
  kind: "invoice" | "proposal",
) {
  const gte = startOfMonth(new Date());
  if (kind === "invoice") {
    return prisma.invoice.count({ where: { userId, createdAt: { gte } } });
  }
  return prisma.proposal.count({ where: { userId, createdAt: { gte } } });
}

export async function assertCanCreate(
  userId: string,
  plan: PlanId,
  kind: "invoice" | "proposal",
) {
  const createdThisMonth = await countCreatedThisMonth(userId, kind);
  const check = canCreateDocument({ plan, kind, createdThisMonth });
  if (!check.ok) {
    const noun = kind === "invoice" ? "invoices" : "proposals";
    throw new Error(
      `Starter plan includes ${check.limit} ${noun} per month. Upgrade to Pro for unlimited.`,
    );
  }
  return check;
}

export function redirectIfLimitReached(error: unknown): never {
  if (error instanceof Error && error.message.includes("Starter plan")) {
    redirect("/dashboard/billing?error=limit");
  }
  throw error;
}

export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "void"] as const;
export const PROPOSAL_STATUSES = ["draft", "sent", "accepted", "declined"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
