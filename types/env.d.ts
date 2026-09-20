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
    INTUIT_CLIENT_ID?: string;
    INTUIT_CLIENT_SECRET?: string;
    INTUIT_REDIRECT_URI?: string;
    AUTH_SECRET?: string;
    AUTH_URL?: string;
    AUTH_TRUST_HOST?: string;
    NEXTAUTH_SECRET?: string;
    NEXTAUTH_URL?: string;
    AUTH_GOOGLE_ID?: string;
    AUTH_GOOGLE_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    SPONSOR_NAME?: string;
    SPONSOR_URL?: string;
    SPONSOR_LOGO_URL?: string;
    SPONSOR_BLURB?: string;
  }
}
