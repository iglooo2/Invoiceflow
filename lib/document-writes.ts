import type { PrismaClient } from "@prisma/client";

/**
 * Neon HTTP (`PrismaNeonHTTP`) rejects `startTransaction()`. Prisma nested
 * writes (`items: { create: [...] }`) and `$transaction([...])` both compile
 * to multi-statement plans, which crash the Cloudflare Worker with a generic
 * error page. These helpers issue one statement at a time so invoice/proposal
 * saves work on the same adapter as signup.
 */
export type InvoiceWriteInput = {
  userId: string;
  clientId?: string | null;
  number: string;
  status: string;
  issueDate: Date;
  dueDate: Date | null;
  taxRate: number;
  notes?: string | null;
  publicToken: string;
  clientName: string;
  clientEmail?: string | null;
  clientCompany?: string | null;
  clientAddress?: string | null;
  currency?: string;
};

export type InvoiceLineInput = {
  description: string;
  quantity: number;
  rate: number;
};

export type ProposalWriteInput = {
  userId: string;
  clientId?: string | null;
  title: string;
  status: string;
  validUntil: Date | null;
  notes?: string | null;
  publicToken: string;
  clientName: string;
  clientEmail?: string | null;
  clientCompany?: string | null;
  taxRate?: number;
  markupRate?: number;
  attachments?: string | null;
  currency?: string;
};

export type ProposalSectionInput = {
  heading: string;
  body: string;
  amount: number | null;
};

function invoiceScalars(input: InvoiceWriteInput, now: Date) {
  return {
    userId: input.userId,
    clientId: input.clientId ?? null,
    number: input.number,
    status: input.status,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    taxRate: input.taxRate,
    notes: input.notes ?? null,
    publicToken: input.publicToken,
    clientName: input.clientName,
    clientEmail: input.clientEmail ?? null,
    clientCompany: input.clientCompany ?? null,
    clientAddress: input.clientAddress ?? null,
    ...(input.currency ? { currency: input.currency } : {}),
    updatedAt: now,
  };
}

function proposalScalars(input: ProposalWriteInput, now: Date) {
  return {
    userId: input.userId,
    clientId: input.clientId ?? null,
    title: input.title,
    status: input.status,
    validUntil: input.validUntil,
    notes: input.notes ?? null,
    publicToken: input.publicToken,
    clientName: input.clientName,
    clientEmail: input.clientEmail ?? null,
    clientCompany: input.clientCompany ?? null,
    taxRate: input.taxRate ?? 0,
    markupRate: input.markupRate ?? 0,
    attachments: input.attachments ?? null,
    ...(input.currency ? { currency: input.currency } : {}),
    updatedAt: now,
  };
}

async function insertLines(db: PrismaClient, invoiceId: string, items: InvoiceLineInput[]) {
  for (const [index, item] of items.entries()) {
    await db.invoiceItem.create({
      data: {
        id: crypto.randomUUID(),
        invoiceId,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        sortOrder: index,
      },
    });
  }
}

async function insertSections(db: PrismaClient, proposalId: string, sections: ProposalSectionInput[]) {
  for (const [index, section] of sections.entries()) {
    await db.proposalSection.create({
      data: {
        id: crypto.randomUUID(),
        proposalId,
        heading: section.heading,
        body: section.body,
        amount: section.amount,
        sortOrder: index,
      },
    });
  }
}

export async function insertInvoiceWithItems(
  db: PrismaClient,
  input: InvoiceWriteInput,
  items: InvoiceLineInput[],
) {
  const now = new Date();
  const id = crypto.randomUUID();
  const invoice = await db.invoice.create({
    data: {
      id,
      ...invoiceScalars(input, now),
      createdAt: now,
    },
  });
  try {
    await insertLines(db, invoice.id, items);
  } catch (error) {
    await db.invoice.delete({ where: { id: invoice.id } }).catch(() => undefined);
    throw error;
  }
  return invoice;
}

export async function replaceInvoiceItems(
  db: PrismaClient,
  invoiceId: string,
  input: Omit<InvoiceWriteInput, "userId" | "number" | "publicToken">,
  items: InvoiceLineInput[],
) {
  const now = new Date();
  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      clientId: input.clientId ?? null,
      status: input.status,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      taxRate: input.taxRate,
      notes: input.notes ?? null,
      clientName: input.clientName,
      clientEmail: input.clientEmail ?? null,
      clientCompany: input.clientCompany ?? null,
      clientAddress: input.clientAddress ?? null,
      updatedAt: now,
    },
  });
  await db.invoiceItem.deleteMany({ where: { invoiceId } });
  await insertLines(db, invoiceId, items);
}

export async function insertProposalWithSections(
  db: PrismaClient,
  input: ProposalWriteInput,
  sections: ProposalSectionInput[],
) {
  const now = new Date();
  const id = crypto.randomUUID();
  const proposal = await db.proposal.create({
    data: {
      id,
      ...proposalScalars(input, now),
      createdAt: now,
    },
  });
  try {
    await insertSections(db, proposal.id, sections);
  } catch (error) {
    await db.proposal.delete({ where: { id: proposal.id } }).catch(() => undefined);
    throw error;
  }
  return proposal;
}

export async function replaceProposalSections(
  db: PrismaClient,
  proposalId: string,
  input: Omit<ProposalWriteInput, "userId" | "publicToken">,
  sections: ProposalSectionInput[],
) {
  const now = new Date();
  await db.proposal.update({
    where: { id: proposalId },
    data: {
      clientId: input.clientId ?? null,
      title: input.title,
      status: input.status,
      validUntil: input.validUntil,
      notes: input.notes ?? null,
      clientName: input.clientName,
      clientEmail: input.clientEmail ?? null,
      clientCompany: input.clientCompany ?? null,
      taxRate: input.taxRate ?? 0,
      markupRate: input.markupRate ?? 0,
      attachments: input.attachments ?? null,
      updatedAt: now,
    },
  });
  await db.proposalSection.deleteMany({ where: { proposalId } });
  await insertSections(db, proposalId, sections);
}
