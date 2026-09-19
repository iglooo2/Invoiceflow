import { test } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { findJobForUser, listJobsForUser, normalizeJob } from "./job-queries";
import { JOB_SCHEMA_WARNING } from "./jobs";

const row = {
  id: "job-1",
  userId: "user-1",
  clientId: "client-1",
  title: "Kitchen remodel",
  jobNumber: "JOB-2026-0001",
  address: "14 Shotwell St",
  startDate: new Date("2026-09-19"),
  endDate: new Date("2026-10-02"),
  status: "active",
  notes: "Bring samples",
  createdAt: new Date("2026-09-19"),
  updatedAt: new Date("2026-09-19"),
  client: { name: "Hearth Goods", address: "14 Shotwell St" },
  estimates: [
    {
      id: "link-e",
      estimateId: "est-1",
      estimate: { id: "est-1", title: "Kitchen estimate", clientName: "Hearth Goods", status: "sent" },
    },
  ],
  invoices: [],
  visits: [{ id: "visit-1", notes: "Site walk", scheduledAt: new Date("2026-09-21") }],
};

test("normalizeJob maps links and defaults status", () => {
  const job = normalizeJob({ ...row, status: "nope", estimates: undefined, invoices: undefined, visits: undefined });
  assert.equal(job.status, "active");
  assert.equal(job.clientName, "Hearth Goods");
  assert.deepEqual(job.estimates, []);
  assert.deepEqual(job.visits, []);
});

test("listJobsForUser returns a schema warning instead of throwing", async () => {
  const db = {
    job: {
      findMany: async () => {
        throw { name: "PrismaClientKnownRequestError", code: "P2021", message: 'The table `Job` does not exist' };
      },
    },
  };
  const result = await listJobsForUser(db as unknown as PrismaClient, { userId: "user-1" });
  assert.equal(result.usedLegacySchema, true);
  assert.deepEqual(result.jobs, []);
  assert.equal(result.warning, JOB_SCHEMA_WARNING);
});

test("findJobForUser returns the normalized row", async () => {
  const db = {
    job: {
      findFirst: async () => row,
    },
  };
  const result = await findJobForUser(db as unknown as PrismaClient, { userId: "user-1", jobId: "job-1" });
  assert.equal(result.job?.title, "Kitchen remodel");
  assert.equal(result.job?.estimates[0]?.title, "Kitchen estimate");
  assert.equal(result.usedLegacySchema, false);
});
