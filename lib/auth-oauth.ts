/**
 * Google verifies emails. Auth.js will not auto-link an OAuth profile onto an
 * existing email/password user unless `allowDangerousEmailAccountLinking` is
 * on *and* we trust the provider. Only Google (verified) and Apple qualify.
 */
export function oauthProviderVerifiesEmail(provider: string | undefined) {
  return provider === "google" || provider === "apple";
}

export function googleEmailIsVerified(profile: { email_verified?: boolean | string } | undefined) {
  return profile?.email_verified === true || profile?.email_verified === "true";
}

export function allowVerifiedOauthAccountLinking(
  provider: string | undefined,
  profile?: { email_verified?: boolean | string },
) {
  if (provider === "google") return googleEmailIsVerified(profile);
  if (provider === "apple") return true;
  return false;
}
