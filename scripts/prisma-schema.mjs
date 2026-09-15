/**
 * Rewrites prisma/schema.prisma for the target provider.
 * Postgres gets the rust-free client engine (required on Cloudflare Workers).
 * SQLite keeps the default engine so `npm run setup` needs no adapter.
 */
export function buildRuntimeSchema(source, provider) {
  let runtime = source.replace(
    /(datasource db \{[\s\S]*?provider\s*=\s*)"(sqlite|postgresql)"/,
    `$1"${provider}"`,
  );

  if (provider === "postgresql") {
    runtime = runtime.replace(/generator client \{([\s\S]*?)\}/, (block) => {
      if (/engineType\s*=/.test(block)) return block;
      return block.replace(
        /provider\s*=\s*"prisma-client-js"/,
        'provider   = "prisma-client-js"\n  engineType = "client"',
      );
    });
  }

  return runtime;
}
