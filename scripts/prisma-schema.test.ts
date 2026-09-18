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

test("cf:build generates the Postgres client before OpenNext", () => {
  const script = readFileSync(path.join(root, "scripts/cf-build.mjs"), "utf8");
  const generateAt = script.indexOf('["scripts/prisma.mjs", "generate"]');
  const openNextAt = script.indexOf("opennextjs-cloudflare");
  assert.notEqual(generateAt, -1);
  assert.notEqual(openNextAt, -1);
  assert.equal(generateAt < openNextAt, true);
  assert.match(script, /PRISMA_PROVIDER:\s*"postgresql"/);
});
