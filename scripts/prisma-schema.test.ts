import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildRuntimeSchema } from "./prisma-schema.mjs";

const source = readFileSync(path.join(import.meta.dirname, "../prisma/schema.prisma"), "utf8");

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
