declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Optional Prisma datasource override (`postgresql` / `sqlite`).
     * Read by `scripts/prisma.mjs`, `lib/site.ts`, and Cloudflare `cf:build`.
     * Next.js types `NODE_ENV` as a known property, which drops the string
     * index signature when spreading `process.env` — keep this key declared,
     * and type spawn env copies as `NodeJS.ProcessEnv` (see prisma-schema tests).
     */
    PRISMA_PROVIDER?: string;
    DATABASE_URL?: string;
  }
}
