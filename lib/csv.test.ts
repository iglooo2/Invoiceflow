import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getDictionary } from "./dictionary";
import { LOCALES } from "./i18n";
import {
  csvDownloadHeaders,
  csvExportHref,
  csvIsoDate,
  csvMoney,
  escapeCsvField,
  estimatesExportFilename,
  estimatesToCsv,
  invoiceListWhere,
  invoicesExportFilename,
  invoicesToCsv,
  parseListFilters,
  toCsv,
} from "./csv";
import { normalizeEstimate } from "./proposal-queries";

test("escapeCsvField quotes commas, quotes, and newlines", () => {
  assert.equal(escapeCsvField("plain"), "plain");
  assert.equal(escapeCsvField("Acme, Inc"), '"Acme, Inc"');
  assert.equal(escapeCsvField('Say "hello"'), '"Say ""hello"""');
  assert.equal(escapeCsvField("line\nbreak"), '"line\nbreak"');
  assert.equal(escapeCsvField(null), "");
  assert.equal(escapeCsvField(12.5), "12.5");
});

test("toCsv uses CRLF and keeps a trailing newline", () => {
  const csv = toCsv(["name", "note"], [["Acme, Inc", 'Quote "A"']]);
  assert.equal(csv, 'name,note\r\n"Acme, Inc","Quote ""A"""\r\n');
});

test("invoice CSV includes practical columns and spreadsheet amounts", () => {
  const csv = invoicesToCsv([
    {
      id: "inv_1",
      number: "INV-2026-0001",
      clientName: "Hearth, Goods",
      clientEmail: "ap@hearth.test",
      clientCompany: "Hearth Goods",
      status: "sent",
      issueDate: new Date("2026-09-18T12:00:00Z"),
      dueDate: new Date("2026-10-02T12:00:00Z"),
      poNumber: "PO-9",
      taxRate: 8,
      currency: "USD",
      items: [
        { quantity: 1, rate: 1000 },
        { quantity: 2, rate: 250 },
      ],
    },
  ]);
  assert.match(csv, /^number,id,client_name,client_email,client_company,status,issue_date,due_date,po_number,subtotal,tax,total,currency\r\n/);
  assert.match(csv, /INV-2026-0001,inv_1,"Hearth, Goods",ap@hearth.test,Hearth Goods,sent,2026-09-18,2026-10-02,PO-9,1500.00,120.00,1620.00,USD\r\n/);
});

test("estimate CSV includes title, dates, totals, and currency", () => {
  const csv = estimatesToCsv([
    normalizeEstimate({
      id: "est_1",
      title: "Job estimate",
      clientName: "Oak & Film",
      clientEmail: "oak@film.test",
      clientCompany: null,
      status: "accepted",
      createdAt: new Date("2026-09-01T12:00:00Z"),
      validUntil: new Date("2026-09-15T12:00:00Z"),
      viewedAt: new Date("2026-09-02T12:00:00Z"),
      signedName: "Jordan",
      signedAt: new Date("2026-09-03T12:00:00Z"),
      taxRate: 8,
      markupRate: 10,
      currency: "USD",
      sections: [{ heading: "Labor", body: "Install", amount: 1000 }],
    }),
  ]);
  assert.match(csv, /^id,title,client_name,/);
  assert.match(csv, /est_1,Job estimate,Oak & Film,oak@film.test,,accepted,2026-09-01,2026-09-15,2026-09-02,Jordan,2026-09-03,1000.00,100.00,88.00,1188.00,USD\r\n/);
});

test("download headers attach a dated CSV filename", () => {
  const when = new Date("2026-09-19T15:04:00Z");
  const invoices = csvDownloadHeaders(invoicesExportFilename(when));
  const estimates = csvDownloadHeaders(estimatesExportFilename(when));
  assert.equal(invoices["Content-Type"], "text/csv; charset=utf-8");
  assert.equal(invoices["Content-Disposition"], 'attachment; filename="invoices-2026-09-19.csv"');
  assert.equal(estimates["Content-Disposition"], 'attachment; filename="estimates-2026-09-19.csv"');
  assert.equal(invoices["Cache-Control"], "private, no-store");
  assert.equal(csvIsoDate(null), "");
  assert.equal(csvMoney(2450), "24.50");
});

test("export href and invoice where keep the list filters and user scope", () => {
  const filters = parseListFilters({ status: "paid", q: "  Hearth  " });
  assert.deepEqual(filters, { status: "paid", q: "Hearth" });
  assert.equal(csvExportHref("invoices", filters), "/api/invoices/csv?status=paid&q=Hearth");
  assert.equal(csvExportHref("estimates", {}), "/api/estimates/csv");
  const where = invoiceListWhere("user_1", filters);
  assert.equal(where.userId, "user_1");
  assert.equal(where.status, "paid");
  assert.deepEqual(where.OR, [
    { number: { contains: "Hearth" } },
    { clientName: { contains: "Hearth" } },
    { clientCompany: { contains: "Hearth" } },
  ]);
});

test("dashboard list pages expose a translated Export CSV download", () => {
  const invoicesPage = readFileSync(path.join(import.meta.dirname, "../app/dashboard/invoices/page.tsx"), "utf8");
  const estimatesPage = readFileSync(path.join(import.meta.dirname, "../app/dashboard/estimates/page.tsx"), "utf8");
  const invoiceRoute = readFileSync(path.join(import.meta.dirname, "../app/api/invoices/csv/route.ts"), "utf8");
  const estimateRoute = readFileSync(path.join(import.meta.dirname, "../app/api/estimates/csv/route.ts"), "utf8");

  assert.match(invoicesPage, /dict\.app\.exportCsv/);
  assert.match(invoicesPage, /csvExportHref\("invoices"/);
  assert.match(estimatesPage, /dict\.app\.exportCsv/);
  assert.match(estimatesPage, /csvExportHref\("estimates"/);

  assert.match(invoiceRoute, /await auth\(\)/);
  assert.match(invoiceRoute, /session\?\.user\?\.id/);
  assert.match(invoiceRoute, /invoiceListWhere\(session\.user\.id/);
  assert.match(estimateRoute, /await auth\(\)/);
  assert.match(estimateRoute, /listEstimatesForUser/);
  assert.match(estimateRoute, /userId: session\.user\.id/);

  for (const locale of LOCALES) {
    const dict = getDictionary(locale);
    assert.ok(dict.app.exportCsv.length > 0, locale);
  }
});
