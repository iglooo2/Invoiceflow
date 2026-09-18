import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildRuntimeSchema } from "./prisma-schema.mjs";

const root = path.join(import.meta.dirname, "..");
const source = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");

/**
 * `next build` typechecks this file via `tsc`. Spreading `process.env` infers a
 * closed `{ DATABASE_URL; NODE_ENV }` object because Next.js types `NODE_ENV` as
 * a known key, which drops ProcessEnv's string index signature. Return
 * `NodeJS.ProcessEnv` so `PRISMA_PROVIDER` remains a valid key to delete.
 */
function processEnvCopy(
  overrides: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  return { ...process.env, ...overrides };
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

test("PRISMA_PROVIDER is a typed process.env key after env spread", () => {
  const restore = processEnvCopy({
    DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
  });
  delete restore.PRISMA_PROVIDER;
  assert.equal(restore.PRISMA_PROVIDER, undefined);
});

test("prisma generate with PRISMA_PROVIDER=postgresql works without a postgres DATABASE_URL", () => {
  const gen = spawnSync("node", ["scripts/prisma.mjs", "generate"], {
    cwd: root,
    encoding: "utf8",
    env: processEnvCopy({ PRISMA_PROVIDER: "postgresql", DATABASE_URL: "file:./dev.db" }),
  });
  try {
    assert.equal(gen.status, 0, gen.stderr || gen.stdout);
    const runtime = readFileSync(path.join(root, "prisma/schema.runtime.prisma"), "utf8");
    assert.match(runtime, /provider\s*=\s*"postgresql"/);
    assert.match(runtime, /engineType\s*=\s*"client"/);
  } finally {
    const restore = processEnvCopy({
      DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
    });
    delete restore.PRISMA_PROVIDER;
    spawnSync("node", ["scripts/prisma.mjs", "generate"], {
      cwd: root,
      env: restore,
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
