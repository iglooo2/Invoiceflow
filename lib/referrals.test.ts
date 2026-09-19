import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REFERRAL_QUALIFYING_DAYS,
  REFERRAL_REWARD_USD,
  canonicalReferralUrl,
  isReferralCode,
  newReferralCode,
  publicReferralUrl,
  referralPath,
} from "./referrals";

test("referral reward and qualifying window stay configurable constants", () => {
  assert.equal(REFERRAL_REWARD_USD, 30);
  assert.equal(REFERRAL_QUALIFYING_DAYS, 65);
});

test("referral links use InvoiceFlow Studio hosts, never a competitor domain", () => {
  const code = "AbC123_xyz";
  assert.equal(referralPath(code), "/r/AbC123_xyz");
  assert.equal(canonicalReferralUrl(code), "https://invoiceflowstudio.com/r/AbC123_xyz");
  assert.equal(
    publicReferralUrl(code, "https://invoiceflowstudio.com"),
    "https://invoiceflowstudio.com/r/AbC123_xyz",
  );
  assert.equal(isReferralCode(code), true);
  assert.equal(isReferralCode("no"), false);
  assert.match(newReferralCode(), /^[A-Za-z0-9_-]{10}$/);
});
