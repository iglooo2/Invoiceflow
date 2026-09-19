import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  formatJobDateRange,
  JOB_LIST_PATH,
  JOB_NEW_PATH,
  nextJobNumberFromExisting,
  parseJobStatus,
  parseJsonIdList,
  parseVisitsJson,
} from "./jobs";

const root = path.join(import.meta.dirname, "..");

test("nextJobNumberFromExisting increments the year prefix", () => {
  assert.equal(nextJobNumberFromExisting([], new Date("2026-09-19")), "JOB-2026-0001");
  assert.equal(
    nextJobNumberFromExisting(["JOB-2026-0003", "JOB-2025-0099"], new Date("2026-01-01")),
    "JOB-2026-0004",
  );
});

test("parseJobStatus defaults to active", () => {
  assert.equal(parseJobStatus("complete"), "complete");
  assert.equal(parseJobStatus("nope"), "active");
  assert.equal(parseJobStatus(undefined), "active");
});

test("parseJsonIdList and parseVisitsJson ignore junk", () => {
  assert.deepEqual(parseJsonIdList('["a","b"]'), ["a", "b"]);
  assert.deepEqual(parseJsonIdList("not-json"), []);
  assert.deepEqual(parseVisitsJson('[{"notes":"Walkthrough","scheduledAt":"2026-09-20"}]'), [
    { notes: "Walkthrough", scheduledAt: "2026-09-20" },
  ]);
  assert.deepEqual(parseVisitsJson("[]"), []);
});

test("formatJobDateRange joins start and end", () => {
  assert.equal(formatJobDateRange("2026-09-19", "2026-10-02"), "Sep 19 – Oct 2");
  assert.equal(formatJobDateRange(null, null), "");
});

test("dashboard nav lists Jobs next to Estimates", () => {
  const layout = readFileSync(path.join(root, "app/dashboard/layout.tsx"), "utf8");
  const estimatesAt = layout.indexOf('"/dashboard/estimates"');
  const jobsAt = layout.indexOf('"/dashboard/jobs"');
  assert.notEqual(estimatesAt, -1);
  assert.notEqual(jobsAt, -1);
  assert.equal(estimatesAt < jobsAt, true);
  const jobsPage = readFileSync(path.join(root, "app/dashboard/jobs/page.tsx"), "utf8");
  assert.match(jobsPage, /JOB_NEW_PATH/);
  assert.match(jobsPage, /emptyTitle/);
  const form = readFileSync(path.join(root, "components/jobs/job-form.tsx"), "utf8");
  assert.match(form, /addClient/);
  assert.match(form, /linkEstimates/);
  assert.match(form, /createVisit/);
  assert.match(form, /markCompleted/);
  assert.equal(layout.includes(JOB_LIST_PATH), true);
  assert.equal(JOB_NEW_PATH.startsWith(JOB_LIST_PATH), true);
});
