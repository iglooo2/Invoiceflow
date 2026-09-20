import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildInvoicePdf,
  buildProposalPdf,
  pdfDownloadHeaders,
  sanitizePdfFilename,
  toWinAnsi,
} from "./pdf";

const invoice = {
  number: "INV-2026-0001",
  status: "sent",
  issueDate: new Date("2026-09-18T12:00:00Z"),
  dueDate: new Date("2026-10-02T12:00:00Z"),
  taxRate: 8,
  notes: "Thanks — please pay via ACH (net 14).",
  currency: "USD",
  clientName: "Acme (Holdings)",
  clientEmail: "ap@acme.test",
  clientCompany: "Acme “Studios”",
  clientAddress: "1 Main St",
  items: [
    { description: "Brand guidelines (PDF)", quantity: 1, rate: 600 },
    { description: "Retainer hours", quantity: 4, rate: 125 },
  ],
};

const studio = {
  businessName: "Studio North",
  email: "hello@north.test",
  businessPhone: "555-0100",
  businessAddress: "12 Pine Row",
  website: "https://north.test",
};

function asLatin1(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("latin1");
}

test("invoice PDF is a small uncompressed standard-font document", async () => {
  const started = Date.now();
  const bytes = await buildInvoicePdf({ studio, invoice, branded: true });
  const elapsed = Date.now() - started;
  const source = asLatin1(bytes);

  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.byteLength < 8_000, `expected lean PDF, got ${bytes.byteLength} bytes`);
  assert.ok(elapsed < 50, `expected cheap generation, took ${elapsed}ms`);
  assert.equal(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]), "%PDF-");
  assert.match(source, /%%EOF/);
  assert.match(source, /\/BaseFont \/Helvetica/);
  assert.match(source, /\/BaseFont \/Helvetica-Bold/);
  assert.match(source, /\/BaseFont \/Times-Bold/);
  assert.doesNotMatch(source, /\/FlateDecode/);
  assert.doesNotMatch(source, /\/FontFile/);
  assert.match(source, /INV-2026-0001/);
  assert.match(source, /Acme \\\(Holdings\\\)/);
  assert.match(source, /Total due/);
  assert.match(source, /Made with InvoiceFlow Studio/);
});

test("invoice PDF includes studio footer message from settings", async () => {
  const bytes = await buildInvoicePdf({
    studio: { ...studio, footerMessage: "Pay by ACH. Net due upon receipt." },
    invoice,
    branded: false,
  });
  const source = asLatin1(bytes);
  assert.match(source, /Additional notes/);
  assert.match(source, /Pay by ACH/);
});

test("proposal PDF includes title, investment, and no branded footer for Pro", async () => {
  const bytes = await buildProposalPdf({
    studio,
    branded: false,
    proposal: {
      title: "Video edit",
      status: "sent",
      validUntil: new Date("2026-11-01T00:00:00Z"),
      notes: "Scope is two rounds of notes.",
      currency: "USD",
      clientName: "Jordan",
      clientEmail: "jordan@client.test",
      clientCompany: null,
      sections: [
        { heading: "Edit", body: "Assembly cut plus color.", amount: 1800 },
        { heading: "Delivery", body: "ProRes + captions.", amount: null },
      ],
    },
  });
  const source = asLatin1(bytes);
  assert.match(source, /Video edit/);
  assert.match(source, /ESTIMATE/);
  assert.match(source, /Investment/);
  assert.match(source, /\$1,800\.00/);
  assert.doesNotMatch(source, /Made with InvoiceFlow Studio/);
});

test("long invoices paginate instead of overflowing a single page", async () => {
  const bytes = await buildInvoicePdf({
    studio,
    branded: false,
    invoice: {
      ...invoice,
      items: Array.from({ length: 40 }, (_, index) => ({
        description: `Line ${index + 1}`,
        quantity: 1,
        rate: 10,
      })),
    },
  });
  const source = asLatin1(bytes);
  assert.match(source, /\/Count 2/);
  assert.match(source, /Line 40/);
});

test("maps typographic unicode into WinAnsi and strips control chars", () => {
  assert.equal(toWinAnsi("Hello—world"), `Hello${String.fromCharCode(0x97)}world`);
  assert.equal(toWinAnsi("“quotes”"), `${String.fromCharCode(0x93)}quotes${String.fromCharCode(0x94)}`);
  assert.equal(toWinAnsi("line\nbreak"), "line break");
  assert.equal(toWinAnsi("ok 🙂"), "ok ?");
});

test("download headers attach a safe filename without Buffer copies", () => {
  const headers = pdfDownloadHeaders('INV-2026-0001 / "draft"');
  assert.equal(headers["Content-Type"], "application/pdf");
  assert.equal(headers["Content-Disposition"], 'attachment; filename="inv-2026-0001-draft.pdf"');
  assert.equal(headers["Cache-Control"], "private, no-store");
  assert.equal(sanitizePdfFilename(""), "document.pdf");
  assert.equal(sanitizePdfFilename("Picture edit & sound pass"), "picture-edit-sound-pass.pdf");
});

test("PDF stack does not load pdf-lib or copy through Buffer in routes", () => {
  const root = process.cwd();
  const files = [
    "lib/pdf.ts",
    "app/api/invoices/[id]/pdf/route.ts",
    "app/api/share/i/[token]/pdf/route.ts",
    "app/api/proposals/[id]/pdf/route.ts",
    "app/api/share/p/[token]/pdf/route.ts",
    "app/share/i/[token]/page.tsx",
    "next.config.ts",
    "package.json",
  ];
  for (const relative of files) {
    const source = readFileSync(path.join(root, relative), "utf8");
    assert.doesNotMatch(source, /from ["']pdf-lib["']|require\(["']pdf-lib["']\)/, relative);
    if (relative.startsWith("app/api/") || relative.startsWith("app/share/")) {
      assert.doesNotMatch(source, /Buffer\.from/, relative);
      assert.doesNotMatch(source, /include: \{ items:.*user: true/, relative);
    }
  }
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
  };
  assert.equal(pkg.dependencies?.["pdf-lib"], undefined);
});
