-- Idempotent Postgres patch for Estimates columns added in PR #23.
-- Fixes: prisma:error Invalid prisma.proposal.findMany() invocation:
--         column Proposal.taxRate does not exist
-- Prefer: npm run db:push:prod  (uses DATABASE_URL_UNPOOLED when set)
-- Neon: run against the DIRECT / unpooled connection string, not *-pooler.

ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "markupRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "viewedAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "signedName" TEXT;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "signedAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "attachments" TEXT;

ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "markupRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "viewedAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "signedName" TEXT;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "signedAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "attachments" TEXT;
