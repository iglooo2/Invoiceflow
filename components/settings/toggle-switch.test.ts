import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(path.join(import.meta.dirname, "toggle-switch.tsx"), "utf8");

test("settings toggle uses one compact track size for on and off", () => {
  assert.match(source, /h-5 w-9/);
  assert.match(source, /size-4/);
  assert.match(source, /p-0\.5/);
  assert.match(source, /translate-x-4/);
  assert.match(source, /translate-x-0/);
  assert.match(source, /bg-accent/);
  assert.match(source, /bg-border/);
  assert.match(source, /bg-card/);
  assert.equal(source.includes("h-7 w-12"), false);
  assert.equal(source.includes("translate-x-5"), false);
  assert.equal(source.includes("translate-x-0.5"), false);
  assert.equal(/absolute/.test(source), false);
});

test("settings toggle keeps a mobile-usable hit target around the compact track", () => {
  assert.match(source, /h-11 w-11/);
  assert.match(source, /role="switch"/);
  assert.match(source, /appearance-none/);
  assert.match(source, /border-0/);
});
