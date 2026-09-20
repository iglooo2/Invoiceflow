import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";
import {
  ESTIMATE_OPTIONAL_COLUMNS,
  findEstimateByPublicToken,
  findEstimateForUser,
  listEstimatesForUser,
  normalizeEstimate,
} from "./proposal-queries";
import { isMissingDatabaseSchemaError, prismaReadFailureMessage } from "./db-errors";

const root = path.join(import.meta.dirname, "..");

const coreRow = {
  id: "est-1",
  userId: "user-1",
  clientId: null,
  title: "Kitchen remodel",
  status: "sent",
  validUntil: new Date("2026-10-01"),
  notes: null,
  currency: "USD",
  publicToken: "tok",
  clientName: "Ada",
  clientEmail: "ada@test",
  clientCompany: null,
  createdAt: new Date("2026-09-01"),
  updatedAt: new Date("2026-09-01"),
  sections: [{ heading: "Labor", body: "Demo and install.", amount: 2400 }],
};

test("normalizeEstimate fills missing Estimates columns with zeros and nulls", () => {
  const estimate = normalizeEstimate(coreRow);
  assert.equal(estimate.taxRate, 0);
  assert.equal(estimate.markupRate, 0);
  assert.equal(estimate.viewedAt, null);
  assert.equal(estimate.signedName, null);
  assert.equal(estimate.attachments, null);
  assert.equal(estimate.sections[0]?.amount, 2400);
});

test("isMissingDatabaseSchemaError matches Prisma P2022 and Postgres 42703", () => {
  assert.equal(
    isMissingDatabaseSchemaError({
      name: "PrismaClientKnownRequestError",
      code: "P2022",
      message: "The column `taxRate` does not exist in the current database.",
    }),
    true,
  );
  assert.equal(
    isMissingDatabaseSchemaError({
      name: "DriverAdapterError",
      message: 'column "markupRate" of relation "Proposal" does not exist',
    }),
    true,
  );
  assert.equal(
    isMissingDatabaseSchemaError({ name: "Error", message: "undefined_column (42703)" }),
    true,
  );
  assert.equal(isMissingDatabaseSchemaError({ name: "Error", message: "timed out" }), false);
});

test("listEstimatesForUser retries without optional columns after P2022", async () => {
  const calls: string[] = [];
  const db = {
    proposal: {
      findMany: async ({ select }: { select: Record<string, unknown> }) => {
        calls.push("findMany");
        if ("taxRate" in select) {
          throw { name: "PrismaClientKnownRequestError", code: "P2022", message: "column taxRate does not exist" };
        }
        assert.equal("taxRate" in select, false);
        assert.equal("sections" in select, true);
        return [coreRow];
      },
      findFirst: async () => null,
      findUnique: async () => null,
    },
  };

  const result = await listEstimatesForUser(db as unknown as PrismaClient, { userId: "user-1" });
  assert.equal(result.error, undefined);
  assert.equal(result.usedLegacySchema, true);
  assert.equal(result.estimates.length, 1);
  assert.equal(result.estimates[0]?.title, "Kitchen remodel");
  assert.equal(result.estimates[0]?.taxRate, 0);
  assert.deepEqual(calls, ["findMany", "findMany"]);
});

test("listEstimatesForUser can select only section amounts for list totals", async () => {
  const db = {
    proposal: {
      findMany: async ({ select, take }: { select: Record<string, unknown>; take?: number }) => {
        const sections = select.sections as { select?: { amount?: boolean } };
        assert.equal(sections?.select?.amount, true);
        assert.equal(take, 100);
        return [coreRow];
      },
      findFirst: async () => null,
      findUnique: async () => null,
    },
  };
  const result = await listEstimatesForUser(db as unknown as PrismaClient, {
    userId: "user-1",
    includeSections: true,
    sectionFields: "amount",
    take: 100,
  });
  assert.equal(result.estimates[0]?.sections[0]?.amount, 2400);
});

test("listEstimatesForUser returns an in-page error instead of throwing", async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://u:p@ep-foo.neon.tech/db";
  const db = {
    proposal: {
      findMany: async () => {
        throw { name: "PrismaClientKnownRequestError", code: "P1001", message: "Can't reach database server" };
      },
      findFirst: async () => null,
      findUnique: async () => null,
    },
  };

  try {
    const result = await listEstimatesForUser(db as unknown as PrismaClient, { userId: "user-1" });
    assert.equal(result.estimates.length, 0);
    assert.match(result.error ?? "", /P1001/);
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

test("findEstimateForUser and public-token lookup use the same fallback", async () => {
  const missing = { name: "Error", message: 'column "viewedAt" of relation "Proposal" does not exist' };
  const db = {
    proposal: {
      findMany: async () => [],
      findFirst: async ({ select }: { select: Record<string, unknown> }) => {
        if ("viewedAt" in select) throw missing;
        return { ...coreRow, id: "est-1" };
      },
      findUnique: async ({ select }: { select: Record<string, unknown> }) => {
        if ("signedName" in select) throw missing;
        return { ...coreRow, publicToken: "tok", user: { businessName: "Studio" } };
      },
    },
  };

  const owned = await findEstimateForUser(db as unknown as PrismaClient, "user-1", "est-1");
  assert.equal(owned.usedLegacySchema, true);
  assert.equal(owned.estimate?.id, "est-1");

  const shared = await findEstimateByPublicToken(db as unknown as PrismaClient, "tok");
  assert.equal(shared.usedLegacySchema, true);
  assert.equal(shared.estimate?.publicToken, "tok");
  assert.equal(shared.estimate?.user?.businessName, "Studio");
});

test("estimate dashboard pages query through the schema-safe helper", () => {
  for (const file of [
    "app/dashboard/estimates/page.tsx",
    "app/dashboard/estimates/[id]/page.tsx",
    "app/dashboard/estimates/[id]/edit/page.tsx",
    "app/dashboard/page.tsx",
    "app/share/p/[token]/page.tsx",
    "app/api/proposals/[id]/pdf/route.ts",
    "app/api/share/p/[token]/pdf/route.ts",
    "app/dashboard/error.tsx",
  ]) {
    const source = readFileSync(path.join(root, file), "utf8");
    if (file.endsWith("error.tsx")) {
      assert.match(source, /db:push:prod/);
      continue;
    }
    assert.match(source, /listEstimatesForUser|findEstimateForUser|findEstimateByPublicToken|findEstimateById/);
    assert.doesNotMatch(source, /prisma\.proposal\.find(Many|First|Unique)/);
  }
  const estimatesList = readFileSync(path.join(root, "app/dashboard/estimates/page.tsx"), "utf8");
  assert.match(estimatesList, /sectionFields: "amount"/);
  assert.match(estimatesList, /DASHBOARD_LIST_TAKE/);
  const invoicesList = readFileSync(path.join(root, "app/dashboard/invoices/page.tsx"), "utf8");
  assert.match(invoicesList, /DASHBOARD_LIST_TAKE/);
  const newInvoice = readFileSync(path.join(root, "app/dashboard/invoices/new/page.tsx"), "utf8");
  assert.match(newInvoice, /DOCUMENT_PICKER_TAKE/);
  const session = readFileSync(path.join(root, "lib/session.ts"), "utf8");
  assert.match(session, /cache\(async/);
  const jobWrites = readFileSync(path.join(root, "lib/job-writes.ts"), "utf8");
  assert.match(jobWrites, /createMany/);
  assert.doesNotMatch(jobWrites, /for \(const estimateId/);
  assert.deepEqual([...ESTIMATE_OPTIONAL_COLUMNS], [
    "taxRate",
    "markupRate",
    "viewedAt",
    "signedName",
    "signedAt",
    "attachments",
  ]);
  const sql = readFileSync(path.join(root, "prisma/add-estimate-columns.sql"), "utf8");
  for (const column of ESTIMATE_OPTIONAL_COLUMNS) {
    assert.match(sql, new RegExp(`ADD COLUMN IF NOT EXISTS "${column}"`));
  }
  assert.match(
    readFileSync(path.join(root, "README.md"), "utf8"),
    /npm run db:push:prod/,
  );
  assert.match(
    readFileSync(path.join(root, "README.md"), "utf8"),
    /column Proposal\.taxRate does not exist/,
  );
});

test("prismaReadFailureMessage tells operators to run db:push:prod", () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://u:p@ep-foo.neon.tech/db";
  try {
    assert.match(
      prismaReadFailureMessage({
        name: "PrismaClientKnownRequestError",
        code: "P2022",
        message: "The column `attachments` does not exist",
      }),
      /db:push:prod/,
    );
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});
