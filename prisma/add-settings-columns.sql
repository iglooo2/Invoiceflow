-- Idempotent Postgres patch for InvoiceFlow Studio Settings (StudioSettings + TaxRate).
-- Prefer: npm run db:push:prod  (uses DATABASE_URL_UNPOOLED when set)
-- Neon: run against the DIRECT / unpooled connection string, not *-pooler.

CREATE TABLE IF NOT EXISTS "StudioSettings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
  "documentLocale" TEXT NOT NULL DEFAULT 'en-US',
  "logoDataUrl" TEXT,
  "businessPhone2" TEXT,
  "businessFax" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "region" TEXT,
  "country" TEXT,
  "postalCode" TEXT,
  "taxNumber" TEXT,
  "industry" TEXT,
  "licenseFileName" TEXT,
  "licenseDataUrl" TEXT,
  "insuranceFileName" TEXT,
  "insuranceDataUrl" TEXT,
  "facebookUrl" TEXT,
  "googleBusinessUrl" TEXT,
  "instagramUrl" TEXT,
  "yelpUrl" TEXT,
  "emailEstimateMessage" TEXT,
  "emailInvoiceMessage" TEXT,
  "notifyClientOpensEmail" BOOLEAN NOT NULL DEFAULT true,
  "notifyEmailNotDelivered" BOOLEAN NOT NULL DEFAULT true,
  "notifyClientSigns" BOOLEAN NOT NULL DEFAULT true,
  "notifyClientViews" BOOLEAN NOT NULL DEFAULT true,
  "organizeLineItemSections" BOOLEAN NOT NULL DEFAULT false,
  "paymentTermsDays" INTEGER NOT NULL DEFAULT 0,
  "footerMessage" TEXT,
  "defaultMarkupPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudioSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudioSettings_userId_key" ON "StudioSettings"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudioSettings_userId_fkey'
  ) THEN
    ALTER TABLE "StudioSettings"
      ADD CONSTRAINT "StudioSettings_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TaxRate" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TaxRate_userId_idx" ON "TaxRate"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TaxRate_userId_fkey'
  ) THEN
    ALTER TABLE "TaxRate"
      ADD CONSTRAINT "TaxRate_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
