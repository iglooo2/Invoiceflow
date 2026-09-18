#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

process.env.PRISMA_PROVIDER = "postgresql";

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, ...extraEnv },
  });
  if (result.status) {
    process.exit(result.status);
  }
}

// Emit the Postgres rust-free client before OpenNext bundles. Do not put a
// placeholder DATABASE_URL on `process.env` for `next build` — it could be
// inlined. prisma.mjs generate uses its own env copy when the URL is sqlite.
run("node", ["scripts/prisma.mjs", "generate"], { PRISMA_PROVIDER: "postgresql" });
run("node", ["scripts/prisma-cf-wasm.mjs", "patch"]);

const extra = process.argv.slice(2);
run("npx", ["opennextjs-cloudflare", ...extra]);

// Copy query_compiler_bg.wasm next to worker.js and import it as CompiledWasm
// before restoring the local SQLite client (which would overwrite node_modules).
run("node", ["scripts/prisma-cf-wasm.mjs", "wire"]);

// OpenNext already bundled the Postgres client. Restore whatever `.env`
// points at so local `npm run setup` / `npm run dev` keep using SQLite.
const restoreEnv = { ...process.env };
delete restoreEnv.PRISMA_PROVIDER;
spawnSync("node", ["scripts/prisma.mjs", "generate"], {
  stdio: "inherit",
  cwd: root,
  env: restoreEnv,
});
