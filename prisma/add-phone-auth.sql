-- Idempotent Postgres patch for InvoiceFlow Studio phone SMS auth.
-- Unique E.164 User.phone + PhoneAuthChallenge + PhoneAuthIpLimit.
-- Prefer: npm run db:push:prod  (uses DATABASE_URL_UNPOOLED when set)
-- Neon: run against the DIRECT / unpooled connection string, not *-pooler.

UPDATE "User"
SET "phone" = NULL
WHERE "phone" IS NOT NULL AND btrim("phone") = '';

UPDATE "User" AS u
SET "phone" = NULL
WHERE u."phone" IS NOT NULL
  AND u.id NOT IN (
    SELECT DISTINCT ON ("phone") id
    FROM "User"
    WHERE "phone" IS NOT NULL
    ORDER BY "phone", "createdAt" ASC, id ASC
  );

CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

CREATE TABLE IF NOT EXISTS "PhoneAuthChallenge" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "codeHash" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sendCount" INTEGER NOT NULL DEFAULT 0,
  "lastSentAt" TIMESTAMP(3) NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT,
  CONSTRAINT "PhoneAuthChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PhoneAuthChallenge_phone_key" ON "PhoneAuthChallenge"("phone");

CREATE TABLE IF NOT EXISTS "PhoneAuthIpLimit" (
  "id" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "sendCount" INTEGER NOT NULL DEFAULT 0,
  "lastSentAt" TIMESTAMP(3) NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PhoneAuthIpLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PhoneAuthIpLimit_ipHash_key" ON "PhoneAuthIpLimit"("ipHash");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PhoneAuthChallenge_userId_fkey'
  ) THEN
    ALTER TABLE "PhoneAuthChallenge"
      ADD CONSTRAINT "PhoneAuthChallenge_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
