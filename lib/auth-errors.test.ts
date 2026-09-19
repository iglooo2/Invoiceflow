import { test } from "node:test";
import assert from "node:assert/strict";
import { getDictionary } from "./dictionary";
import {
  credentialsActionErrorMessage,
  errorCodeFromRedirectDigest,
  isOauthAccountNotLinkedCode,
  loginQueryErrorMessage,
  oauthActionErrorMessage,
  redirectDigestErrorCode,
} from "./auth-errors";

const errors = getDictionary("en").login.errors;

test("login query error does not treat email/password failures as OAuth", () => {
  assert.equal(loginQueryErrorMessage("CredentialsSignin", errors), errors.invalidCredentials);
  assert.equal(loginQueryErrorMessage("credentials", errors), errors.invalidCredentials);
  assert.equal(loginQueryErrorMessage("Configuration", errors), errors.configuration);
  assert.equal(loginQueryErrorMessage("MissingSecret", errors), errors.configuration);
  assert.equal(loginQueryErrorMessage("Callback", errors), errors.signInIncomplete);
  assert.equal(loginQueryErrorMessage("Default", errors), errors.signInIncomplete);
  assert.equal(loginQueryErrorMessage("nope", errors), errors.signInIncomplete);
  assert.equal(loginQueryErrorMessage("", errors), null);
  assert.equal(loginQueryErrorMessage(null, errors), null);
  assert.equal(errors.invalidCredentials.includes("Google"), false);
  assert.equal(errors.signInIncomplete.includes("Google"), false);
  assert.equal(errors.signInIncomplete.includes("Apple"), false);
  assert.equal(errors.configuration.includes("AUTH_SECRET"), true);
});

test("OAuth Auth.js codes use Google/Apple messaging", () => {
  assert.equal(loginQueryErrorMessage("OAuthSignin", errors), errors.oauthFailed);
  assert.equal(loginQueryErrorMessage("OAuthCallback", errors), errors.oauthFailed);
  assert.equal(loginQueryErrorMessage("OAuthCreateAccount", errors), errors.oauthFailed);
  assert.equal(loginQueryErrorMessage("AccessDenied", errors), errors.oauthFailed);
  assert.equal(isOauthAccountNotLinkedCode("OAuthAccountNotLinked"), true);
  assert.equal(isOauthAccountNotLinkedCode("CredentialsSignin"), false);
  assert.equal(loginQueryErrorMessage("OAuthAccountNotLinked", errors), errors.oauthAccountNotLinked);
  assert.match(errors.oauthAccountNotLinked, /email and password/i);
  assert.match(errors.oauthAccountNotLinked, /already exists/i);
  assert.match(errors.oauthAccountNotLinked, /link/i);
  assert.equal(errors.oauthAccountNotLinked.toLowerCase().includes("already linked to a different"), false);
  assert.match(errors.configuration, /Runtime Secret/);
  assert.match(errors.configuration, /Build/);
  assert.match(errors.oauthFailed, /AUTH_GOOGLE_ID/);
  assert.equal(oauthActionErrorMessage("Configuration", errors), errors.oauthFailed);
  assert.equal(oauthActionErrorMessage("OAuthCallback", errors), errors.oauthFailed);
  assert.equal(oauthActionErrorMessage("OAuthAccountNotLinked", errors), errors.oauthAccountNotLinked);
  assert.equal(errors.oauthFailed.includes("email and password, or check"), false);
});

test("register vs login credentials actions pick distinct copy", () => {
  assert.equal(
    credentialsActionErrorMessage("CredentialsSignin", errors, "register"),
    errors.signInFailed,
  );
  assert.equal(
    credentialsActionErrorMessage("CredentialsSignin", errors, "login"),
    errors.invalidCredentials,
  );
  assert.equal(credentialsActionErrorMessage("Configuration", errors, "register"), errors.configuration);
  assert.equal(credentialsActionErrorMessage("Configuration", errors, "login"), errors.configuration);
  assert.equal(errors.signInFailed.includes("Google"), false);
});

test("Auth.js NEXT_REDIRECT digest exposes the error query without swallowing success", () => {
  assert.equal(
    errorCodeFromRedirectDigest("NEXT_REDIRECT;replace;/login?error=CredentialsSignin;303;"),
    "CredentialsSignin",
  );
  assert.equal(
    errorCodeFromRedirectDigest(
      "NEXT_REDIRECT;replace;https://invoiceflowstudio.com/en/login?error=OAuthCallback&mode=register;303;",
    ),
    "OAuthCallback",
  );
  assert.equal(
    errorCodeFromRedirectDigest(
      "NEXT_REDIRECT;replace;%2Fen%2Flogin%3Ferror%3DCredentialsSignin;303;",
    ),
    "CredentialsSignin",
  );
  assert.equal(errorCodeFromRedirectDigest("NEXT_REDIRECT;push;/dashboard;303;"), null);
  assert.equal(errorCodeFromRedirectDigest("NEXT_NOT_FOUND"), null);
  assert.equal(
    redirectDigestErrorCode({ digest: "NEXT_REDIRECT;replace;/api/auth/error?error=Configuration;303;" }),
    "Configuration",
  );
  assert.equal(redirectDigestErrorCode(new Error("nope")), null);
});
