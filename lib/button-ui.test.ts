import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";

const root = path.join(import.meta.dirname, "..");

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("button size tokens stay in the 36–40px range", () => {
  const css = read("app/globals.css");
  assert.match(css, /--btn-height:\s*2\.25rem/);
  assert.match(css, /--btn-height-touch:\s*2\.5rem/);
  assert.match(css, /--btn-height-lg:\s*2\.5rem/);
  assert.match(css, /\.btn-row\s*\{/);
});

test("shared Button uses tokens instead of oversized padding", () => {
  const button = read("components/ui/button.tsx");
  assert.match(button, /export const buttonVariants/);
  assert.match(button, /h-\[var\(--btn-height-touch\)\]/);
  assert.match(button, /sm:h-\[var\(--btn-height\)\]/);
  assert.match(button, /h-\[var\(--btn-height-lg\)\]/);
  assert.equal(button.includes("h-12"), false);
  assert.equal(button.includes("text-base"), false);
  assert.match(button, /shrink-0/);
});

test("marketing CTAs and chrome reuse the shared button system", () => {
  const landing = read("app/[locale]/page.tsx");
  assert.match(landing, /variant="soft"/);
  assert.match(landing, /mt-5 flex justify-center/);
  assert.equal(landing.includes("min-h-14"), false);
  assert.equal(landing.includes("px-7 py-3"), false);
  assert.equal(landing.includes("-mt-5"), false);
  assert.equal(landing.includes("-mt-6"), false);

  const header = read("components/marketing/shell.tsx");
  assert.match(header, /flex-wrap/);
  assert.match(header, /btnRowClass/);

  const switcher = read("components/marketing/language-switcher.tsx");
  assert.match(switcher, /buttonVariants\(\{ variant: "outline"/);
});
