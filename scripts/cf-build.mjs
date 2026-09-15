#!/usr/bin/env node
import { spawnSync } from "node:child_process";

process.env.PRISMA_PROVIDER = "postgresql";
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
