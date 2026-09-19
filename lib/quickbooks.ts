export const INTUIT_CLIENT_ID_ENV = "INTUIT_CLIENT_ID";
export const INTUIT_CLIENT_SECRET_ENV = "INTUIT_CLIENT_SECRET";
export const INTUIT_REDIRECT_URI_ENV = "INTUIT_REDIRECT_URI";

export function quickbooksConfigured(
  env: NodeJS.ProcessEnv = process.env,
) {
  return Boolean(env[INTUIT_CLIENT_ID_ENV]?.trim() && env[INTUIT_CLIENT_SECRET_ENV]?.trim());
}

export function quickbooksRedirectUri(
  env: NodeJS.ProcessEnv = process.env,
) {
  return (
    env[INTUIT_REDIRECT_URI_ENV]?.trim() ||
    `${env.NEXT_PUBLIC_APP_URL || env.AUTH_URL || "https://invoiceflowstudio.com"}/dashboard/settings`
  );
}
