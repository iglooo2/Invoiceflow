#!/usr/bin/env node
import { spawnSync } from "node:child_process";

process.env.PRISMA_PROVIDER = "postgresql";

// Emit the Postgres rust-free client before OpenNext bundles. Do not put a
// placeholder DATABASE_URL on `process.env` for `next build` — it could be
// inlined. prisma.mjs generate uses its own env copy when the URL is sqlite.
const gen = spawnSync("node", ["scripts/prisma.mjs", "generate"], {
  stdio: "inherit",
  env: { ...process.env, PRISMA_PROVIDER: "postgresql" },
});
if (gen.status) {
  process.exit(gen.status);
}

const extra = process.argv.slice(2);
const result = spawnSync("npx", ["opennextjs-cloudflare", ...extra], {
  stdio: "inherit",
  env: process.env,
});

if (result.status) {
  process.exit(result.status);
}

// OpenNext already bundled the Postgres client. Restore whatever `.env`
// points at so local `npm run setup` / `npm run dev` keep using SQLite.
const restoreEnv = { ...process.env };
delete restoreEnv.PRISMA_PROVIDER;
spawnSync("node", ["scripts/prisma.mjs", "generate"], {
  stdio: "inherit",
  env: restoreEnv,
});
