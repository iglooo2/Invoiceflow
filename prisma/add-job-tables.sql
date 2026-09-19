-- Idempotent Postgres patch for InvoiceFlow Studio Jobs
-- (Job + JobEstimate + JobInvoice + JobVisit).
-- Prefer: npm run db:push:prod  (uses DATABASE_URL_UNPOOLED when set)
-- Neon: run against the DIRECT / unpooled connection string, not *-pooler.

CREATE TABLE IF NOT EXISTS "Job" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "clientId" TEXT,
  "title" TEXT NOT NULL,
  "jobNumber" TEXT NOT NULL,
  "address" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Job_userId_jobNumber_key" ON "Job"("userId", "jobNumber");
CREATE INDEX IF NOT EXISTS "Job_userId_status_idx" ON "Job"("userId", "status");
CREATE INDEX IF NOT EXISTS "Job_userId_createdAt_idx" ON "Job"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Job_userId_fkey'
  ) THEN
    ALTER TABLE "Job"
      ADD CONSTRAINT "Job_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Job_clientId_fkey'
  ) THEN
    ALTER TABLE "Job"
      ADD CONSTRAINT "Job_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "JobEstimate" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "estimateId" TEXT NOT NULL,
  CONSTRAINT "JobEstimate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobEstimate_jobId_estimateId_key" ON "JobEstimate"("jobId", "estimateId");
CREATE INDEX IF NOT EXISTS "JobEstimate_estimateId_idx" ON "JobEstimate"("estimateId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'JobEstimate_jobId_fkey'
  ) THEN
    ALTER TABLE "JobEstimate"
      ADD CONSTRAINT "JobEstimate_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'JobEstimate_estimateId_fkey'
  ) THEN
    ALTER TABLE "JobEstimate"
      ADD CONSTRAINT "JobEstimate_estimateId_fkey"
      FOREIGN KEY ("estimateId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "JobInvoice" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  CONSTRAINT "JobInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobInvoice_jobId_invoiceId_key" ON "JobInvoice"("jobId", "invoiceId");
CREATE INDEX IF NOT EXISTS "JobInvoice_invoiceId_idx" ON "JobInvoice"("invoiceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'JobInvoice_jobId_fkey'
  ) THEN
    ALTER TABLE "JobInvoice"
      ADD CONSTRAINT "JobInvoice_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'JobInvoice_invoiceId_fkey'
  ) THEN
    ALTER TABLE "JobInvoice"
      ADD CONSTRAINT "JobInvoice_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "JobVisit" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "scheduledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JobVisit_jobId_idx" ON "JobVisit"("jobId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'JobVisit_jobId_fkey'
  ) THEN
    ALTER TABLE "JobVisit"
      ADD CONSTRAINT "JobVisit_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
