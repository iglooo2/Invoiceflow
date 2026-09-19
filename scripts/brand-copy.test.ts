import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const skipDirs = new Set([
  "node_modules",
  ".git",
  ".next",
  ".open-next",
  "dev.db",
]);

function walk(dir: string, files: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, files);
      continue;
    }
    if (/\.(ts|tsx|js|mjs|cjs|md|json|css|txt|example|prisma)$/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

test("repo copy never names a competing field-service product", () => {
  const root = path.join(import.meta.dirname, "..");
  const needle = ["Joi", "st"].join("").toLowerCase();
  const hits: string[] = [];
  for (const file of walk(root)) {
    const text = readFileSync(file, "utf8");
    if (text.toLowerCase().includes(needle)) {
      hits.push(path.relative(root, file));
    }
  }
  assert.deepEqual(hits, []);
});
