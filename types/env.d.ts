declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Optional Prisma datasource override (`postgresql` / `sqlite`).
     * Read by `scripts/prisma.mjs`, `lib/site.ts`, and Cloudflare `cf:build`.
     * Next.js types `NODE_ENV` as a known property, which drops the string
     * index signature when spreading `process.env`. Keep this key declared for
     * app code; unit tests must not `delete spread.PRISMA_PROVIDER` (TS2339)
     * and are excluded from `next build` typecheck via tsconfig.
     */
    PRISMA_PROVIDER?: string;
    DATABASE_URL?: string;
  }
}
