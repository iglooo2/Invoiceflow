import { test } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { insertJobWithRelations, replaceJobRelations } from "./job-writes";

function memoryDb() {
  const jobs: Array<Record<string, unknown>> = [];
  const estimates: Array<Record<string, unknown>> = [];
  const invoices: Array<Record<string, unknown>> = [];
  const visits: Array<Record<string, unknown>> = [];
  return {
    jobs,
    estimates,
    invoices,
    visits,
    db: {
      job: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          jobs.push(data);
          return data;
        },
        update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const row = jobs.find((job) => job.id === where.id);
          if (row) Object.assign(row, data);
          return row;
        },
        delete: async ({ where }: { where: { id: string } }) => {
          const index = jobs.findIndex((job) => job.id === where.id);
          if (index >= 0) jobs.splice(index, 1);
        },
      },
      jobEstimate: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          estimates.push(data);
          return data;
        },
        deleteMany: async ({ where }: { where: { jobId: string } }) => {
          for (let i = estimates.length - 1; i >= 0; i -= 1) {
            if (estimates[i].jobId === where.jobId) estimates.splice(i, 1);
          }
        },
      },
      jobInvoice: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          invoices.push(data);
          return data;
        },
        deleteMany: async ({ where }: { where: { jobId: string } }) => {
          for (let i = invoices.length - 1; i >= 0; i -= 1) {
            if (invoices[i].jobId === where.jobId) invoices.splice(i, 1);
          }
        },
      },
      jobVisit: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          visits.push(data);
          return data;
        },
        deleteMany: async ({ where }: { where: { jobId: string } }) => {
          for (let i = visits.length - 1; i >= 0; i -= 1) {
            if (visits[i].jobId === where.jobId) visits.splice(i, 1);
          }
        },
      },
    } as unknown as PrismaClient,
  };
}

const baseInput = {
  userId: "user-1",
  title: "Kitchen remodel",
  jobNumber: "JOB-2026-0001",
  address: "14 Shotwell St",
  startDate: new Date("2026-09-19"),
  endDate: new Date("2026-10-02"),
  status: "active",
  notes: "Bring samples",
};

test("insertJobWithRelations writes job then links one statement at a time", async () => {
  const store = memoryDb();
  const job = await insertJobWithRelations(store.db, baseInput, {
    estimateIds: ["est-1"],
    invoiceIds: ["inv-1"],
    visits: [{ notes: "Site walk", scheduledAt: "2026-09-21" }],
  });
  assert.equal(store.jobs.length, 1);
  assert.equal(job.title, "Kitchen remodel");
  assert.equal(store.estimates[0]?.estimateId, "est-1");
  assert.equal(store.invoices[0]?.invoiceId, "inv-1");
  assert.equal(store.visits[0]?.notes, "Site walk");
});

test("replaceJobRelations swaps links without nested writes", async () => {
  const store = memoryDb();
  const created = await insertJobWithRelations(store.db, baseInput, {
    estimateIds: ["est-1"],
    invoiceIds: [],
    visits: [],
  });
  await replaceJobRelations(
    store.db,
    String(created.id),
    {
      title: "Kitchen remodel — phase 2",
      address: "14 Shotwell St",
      startDate: null,
      endDate: null,
      status: "complete",
      notes: null,
    },
    { estimateIds: [], invoiceIds: ["inv-9"], visits: [{ notes: "Punch list" }] },
  );
  assert.equal(store.jobs[0]?.title, "Kitchen remodel — phase 2");
  assert.equal(store.jobs[0]?.status, "complete");
  assert.deepEqual(store.estimates, []);
  assert.equal(store.invoices[0]?.invoiceId, "inv-9");
  assert.equal(store.visits.length, 1);
});
