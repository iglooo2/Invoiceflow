import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  insertInvoiceWithItems,
  insertProposalWithSections,
  replaceInvoiceItems,
} from "./document-writes";
import { nextInvoiceNumberFromExisting } from "./invoice-number";

const root = path.join(import.meta.dirname, "..");

function invoiceInput() {
  return {
    userId: "user-1",
    number: "INV-2026-0001",
    status: "draft",
    issueDate: new Date("2026-09-18"),
    dueDate: new Date("2026-10-02"),
    taxRate: 0,
    publicToken: "token-token-1",
    clientName: "Ada",
  };
}

test("nextInvoiceNumberFromExisting increments in JS without Prisma startsWith", () => {
  assert.equal(
    nextInvoiceNumberFromExisting(["INV-2025-0099", "INV-2026-0003", "INV-2026-0002"], new Date("2026-09-18")),
    "INV-2026-0004",
  );
  assert.equal(nextInvoiceNumberFromExisting([], new Date("2026-01-01")), "INV-2026-0001");
});

test("insertInvoiceWithItems creates the parent then line items, never nested", async () => {
  const calls: string[] = [];
  const created: Record<string, unknown>[] = [];
  const db = {
    invoice: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.push("invoice.create");
        assert.equal("items" in data, false);
        created.push(data);
        return { id: String(data.id) };
      },
      delete: async () => {
        calls.push("invoice.delete");
      },
    },
    invoiceItem: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.push("invoiceItem.create");
        created.push(data);
        return data;
      },
    },
  };

  const invoice = await insertInvoiceWithItems(db as unknown as PrismaClient, invoiceInput(), [
    { description: "Workshop", quantity: 1, rate: 850 },
    { description: "Guidelines", quantity: 1, rate: 600 },
  ]);

  assert.equal(invoice.id, created[0]?.id);
  assert.deepEqual(calls, ["invoice.create", "invoiceItem.create", "invoiceItem.create"]);
  assert.equal(created[1]?.invoiceId, invoice.id);
  assert.equal(created[2]?.description, "Guidelines");
});

test("insertInvoiceWithItems deletes the parent if a line item insert fails", async () => {
  const calls: string[] = [];
  const db = {
    invoice: {
      create: async ({ data }: { data: { id: string } }) => {
        calls.push("invoice.create");
        return { id: data.id };
      },
      delete: async () => {
        calls.push("invoice.delete");
      },
    },
    invoiceItem: {
      create: async () => {
        calls.push("invoiceItem.create");
        throw new Error("Transactions are not supported in HTTP mode");
      },
    },
  };

  await assert.rejects(
    () =>
      insertInvoiceWithItems(db as unknown as PrismaClient, invoiceInput(), [
        { description: "Workshop", quantity: 1, rate: 850 },
      ]),
    /Transactions are not supported/,
  );
  assert.deepEqual(calls, ["invoice.create", "invoiceItem.create", "invoice.delete"]);
});

test("replaceInvoiceItems updates, deletes old lines, then inserts — no $transaction", async () => {
  const calls: string[] = [];
  const db = {
    invoice: {
      update: async () => {
        calls.push("invoice.update");
      },
    },
    invoiceItem: {
      deleteMany: async () => {
        calls.push("invoiceItem.deleteMany");
      },
      create: async () => {
        calls.push("invoiceItem.create");
      },
    },
  };

  await replaceInvoiceItems(
    db as unknown as PrismaClient,
    "inv-1",
    {
      status: "sent",
      issueDate: new Date("2026-09-18"),
      dueDate: null,
      taxRate: 0,
      clientName: "Ada",
    },
    [{ description: "Retainer", quantity: 12, rate: 125 }],
  );

  assert.deepEqual(calls, ["invoice.update", "invoiceItem.deleteMany", "invoiceItem.create"]);
});

test("insertProposalWithSections is sequential like invoices", async () => {
  const calls: string[] = [];
  const db = {
    proposal: {
      create: async ({ data }: { data: { id: string; sections?: unknown } }) => {
        calls.push("proposal.create");
        assert.equal(data.sections, undefined);
        return { id: data.id };
      },
    },
    proposalSection: {
      create: async () => {
        calls.push("proposalSection.create");
      },
    },
  };

  await insertProposalWithSections(
    db as unknown as PrismaClient,
    {
      userId: "user-1",
      title: "Edit",
      status: "draft",
      validUntil: null,
      publicToken: "tok",
      clientName: "Ada",
    },
    [{ heading: "Scope", body: "Cut and color.", amount: 3200 }],
  );

  assert.deepEqual(calls, ["proposal.create", "proposalSection.create"]);
});

test("invoice and proposal actions avoid nested writes and $transaction", () => {
  for (const file of ["app/actions/invoices.ts", "app/actions/proposals.ts"]) {
    const source = readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /\$transaction/);
    assert.doesNotMatch(source, /items:\s*\{\s*create:/);
    assert.doesNotMatch(source, /sections:\s*\{\s*create:/);
    assert.match(source, /insertInvoiceWithItems|insertProposalWithSections/);
  }
});

test("mark paid and similar mutations take FormData and redirect instead of two-arg bind", () => {
  const invoiceActions = readFileSync(path.join(root, "app/actions/invoices.ts"), "utf8");
  const proposalActions = readFileSync(path.join(root, "app/actions/proposals.ts"), "utf8");
  const invoicePage = readFileSync(path.join(root, "app/dashboard/invoices/[id]/page.tsx"), "utf8");
  const proposalPage = readFileSync(path.join(root, "app/dashboard/proposals/[id]/page.tsx"), "utf8");
  const estimatePage = readFileSync(path.join(root, "app/dashboard/estimates/[id]/page.tsx"), "utf8");
  const respondButtons = readFileSync(path.join(root, "app/share/p/[token]/respond-buttons.tsx"), "utf8");

  assert.match(invoiceActions, /export async function markInvoiceStatus\(formData: FormData\)/);
  assert.match(invoiceActions, /redirect\(`\/dashboard\/invoices\/\$\{parsed\.data\.invoiceId\}`\)/);
  assert.match(invoiceActions, /unstable_rethrow/);
  assert.doesNotMatch(invoiceActions, /updateMany\(\{\s*where: \{ id: invoiceId/);
  assert.doesNotMatch(invoicePage, /\.bind\(null,\s*invoice\.id,\s*"paid"\)/);
  assert.match(invoicePage, /name="status" value="paid"/);

  assert.match(proposalActions, /export async function respondToProposal\(formData: FormData\)/);
  assert.doesNotMatch(respondButtons, /\.bind\(null,\s*token,/);
  assert.doesNotMatch(invoicePage, /\.bind\(/);
  assert.doesNotMatch(proposalPage, /\.bind\(/);
  assert.doesNotMatch(estimatePage, /\.bind\(/);
  assert.match(estimatePage, /name="proposalId"/);
});
