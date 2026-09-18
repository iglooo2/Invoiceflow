declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Optional Prisma datasource override (`postgresql` / `sqlite`).
     * Read by `scripts/prisma.mjs`, `lib/site.ts`, and Cloudflare `cf:build`.
     * Declared here so spreading `process.env` keeps the key (Next.js types
     * `NODE_ENV` as a known property, which drops the string index signature).
     */
    PRISMA_PROVIDER?: string;
  }
}
