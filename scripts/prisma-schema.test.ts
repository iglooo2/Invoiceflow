import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildRuntimeSchema } from "./prisma-schema.mjs";

const root = path.join(import.meta.dirname, "..");
const source = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");

/**
 * Copy process.env for spawnSync without a typed `delete env.PRISMA_PROVIDER`.
 *
 * Next.js types NODE_ENV as a known ProcessEnv key, so `{ ...process.env }`
 * infers a closed `{ NODE_ENV; DATABASE_URL? }` object (no index signature).
 * `delete copy.PRISMA_PROVIDER` is then TS2339 even when ProcessEnv declares
 * the key. Omit by string via Reflect.deleteProperty instead.
 */
function spawnEnv(
  overrides: Record<string, string | undefined> = {},
  omitKeys: readonly string[] = [],
): NodeJS.ProcessEnv {
  const env = Object.assign({}, process.env, overrides) as NodeJS.ProcessEnv;
  for (const key of omitKeys) {
    Reflect.deleteProperty(env, key);
  }
  return env;
}

test("User onboarding columns stay in the source schema", () => {
  assert.match(source, /phone\s+String\?/);
  assert.match(source, /employeeCount\s+String\?/);
  assert.match(source, /industry\s+String\?/);
  assert.match(source, /onboardingComplete Boolean @default\(true\)/);
});

test("Job tables stay in the source schema", () => {
  assert.match(source, /model Job \{/);
  assert.match(source, /jobNumber String/);
  assert.match(source, /model JobEstimate \{/);
  assert.match(source, /model JobInvoice \{/);
  assert.match(source, /model JobVisit \{/);
  assert.match(source, /jobs\s+Job\[\]/);
});

test("Contract and referral columns stay off the User query surface", () => {
  assert.match(source, /model Contract \{/);
  assert.match(source, /defaultForEstimates\s+Boolean/);
  assert.match(source, /referralCode\s+String\?\s+@unique/);
  assert.match(source, /referralTermsAcceptedAt\s+DateTime\?/);
});

test("sqlite runtime schema keeps default client engine", () => {
  const runtime = buildRuntimeSchema(source, "sqlite");
  const generator = runtime.match(/generator client \{[\s\S]*?\}/)?.[0] ?? "";
  assert.match(runtime, /provider\s*=\s*"sqlite"/);
  assert.doesNotMatch(generator, /engineType\s*=\s*"client"/);
});

test("postgres runtime schema uses rust-free client engine", () => {
  const runtime = buildRuntimeSchema(source, "postgresql");
  assert.match(runtime, /provider\s*=\s*"postgresql"/);
  assert.match(runtime, /engineType\s*=\s*"client"/);
});

test("prisma generate with PRISMA_PROVIDER=postgresql works without a postgres DATABASE_URL", () => {
  const gen = spawnSync("node", ["scripts/prisma.mjs", "generate"], {
    cwd: root,
    encoding: "utf8",
    env: spawnEnv({ PRISMA_PROVIDER: "postgresql", DATABASE_URL: "file:./dev.db" }),
  });
  try {
    assert.equal(gen.status, 0, gen.stderr || gen.stdout);
    const runtime = readFileSync(path.join(root, "prisma/schema.runtime.prisma"), "utf8");
    assert.match(runtime, /provider\s*=\s*"postgresql"/);
    assert.match(runtime, /engineType\s*=\s*"client"/);
  } finally {
    spawnSync("node", ["scripts/prisma.mjs", "generate"], {
      cwd: root,
      env: spawnEnv(
        { DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db" },
        ["PRISMA_PROVIDER"],
      ),
    });
  }
});

test("prisma generate with PRISMA_CF_WASM patches the Node WASM loader", () => {
  const gen = spawnSync("node", ["scripts/prisma.mjs", "generate"], {
    cwd: root,
    encoding: "utf8",
    env: spawnEnv({
      PRISMA_PROVIDER: "postgresql",
      PRISMA_CF_WASM: "1",
      DATABASE_URL: "file:./dev.db",
    }),
  });
  try {
    assert.equal(gen.status, 0, gen.stderr || gen.stdout);
    const client = readFileSync(path.join(root, "node_modules/.prisma/client/index.js"), "utf8");
    assert.match(client, /__PRISMA_QUERY_COMPILER_WASM/);
    assert.doesNotMatch(client, /new WebAssembly\.Module\(queryCompilerWasmFileBytes\)/);
  } finally {
    spawnSync("node", ["scripts/prisma.mjs", "generate"], {
      cwd: root,
      env: spawnEnv(
        { DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db" },
        ["PRISMA_PROVIDER", "PRISMA_CF_WASM"],
      ),
    });
  }
});

test("cf:build generates the Postgres client before OpenNext", () => {
  const script = readFileSync(path.join(root, "scripts/cf-build.mjs"), "utf8");
  const generateAt = script.indexOf('["scripts/prisma.mjs", "generate"]');
  const openNextAt = script.indexOf("opennextjs-cloudflare");
  const wireAt = script.indexOf('["scripts/prisma-cf-wasm.mjs", "wire"]');
  assert.notEqual(generateAt, -1);
  assert.notEqual(openNextAt, -1);
  assert.notEqual(wireAt, -1);
  assert.equal(generateAt < openNextAt, true);
  assert.equal(openNextAt < wireAt, true);
  assert.match(script, /PRISMA_PROVIDER:\s*"postgresql"/);
  assert.match(script, /PRISMA_CF_WASM:\s*"1"/);
});
