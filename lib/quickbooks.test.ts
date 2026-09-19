import { test } from "node:test";
import assert from "node:assert/strict";
import { quickbooksConfigured, quickbooksRedirectUri } from "./quickbooks";

test("QuickBooks is unconfigured without Intuit secrets", () => {
  assert.equal(quickbooksConfigured({}), false);
  assert.equal(
    quickbooksConfigured({
      INTUIT_CLIENT_ID: "id",
      INTUIT_CLIENT_SECRET: "secret",
    }),
    true,
  );
});

test("QuickBooks redirect defaults to InvoiceFlow settings", () => {
  assert.equal(
    quickbooksRedirectUri({ NEXT_PUBLIC_APP_URL: "https://invoiceflowstudio.com" }),
    "https://invoiceflowstudio.com/dashboard/settings",
  );
  assert.equal(
    quickbooksRedirectUri({ INTUIT_REDIRECT_URI: "https://preview.example/dashboard/settings" }),
    "https://preview.example/dashboard/settings",
  );
});
