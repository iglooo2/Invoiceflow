import { readRuntimeSecret } from "./runtime-env";

export type SponsorFields = {
  name: string;
  url: string;
  logoUrl: string;
  blurb: string;
};

export type SponsorPlacement = SponsorFields & {
  active: boolean;
};

/**
 * Edit these to flip a sponsor without touching the layout.
 * Leave `name` empty to show the labeled “Advertise here” placeholder.
 * Environment variables override these defaults when set.
 */
export const SPONSOR_DEFAULTS: SponsorFields = {
  name: "",
  url: "",
  logoUrl: "",
  blurb: "",
};

export const SPONSOR_ENV_KEYS = {
  name: "SPONSOR_NAME",
  url: "SPONSOR_URL",
  logoUrl: "SPONSOR_LOGO_URL",
  blurb: "SPONSOR_BLURB",
} as const;

export function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveSponsorPlacement(input: Partial<SponsorFields> = {}): SponsorPlacement {
  const name = (input.name ?? "").trim();
  const url = (input.url ?? "").trim();
  const logoUrl = (input.logoUrl ?? "").trim();
  const blurb = (input.blurb ?? "").trim();
  const safeUrl = isHttpUrl(url) ? url : "";
  const safeLogo = isHttpUrl(logoUrl) ? logoUrl : "";
  const active = Boolean(name && safeUrl);
  return {
    active,
    name: active ? name : "",
    url: active ? safeUrl : "",
    logoUrl: active ? safeLogo : "",
    blurb: active ? blurb : "",
  };
}

function readSponsorValue(envName: string, fallback: string) {
  return readRuntimeSecret(envName) || fallback;
}

export function getSponsorPlacement(): SponsorPlacement {
  return resolveSponsorPlacement({
    name: readSponsorValue(SPONSOR_ENV_KEYS.name, SPONSOR_DEFAULTS.name),
    url: readSponsorValue(SPONSOR_ENV_KEYS.url, SPONSOR_DEFAULTS.url),
    logoUrl: readSponsorValue(SPONSOR_ENV_KEYS.logoUrl, SPONSOR_DEFAULTS.logoUrl),
    blurb: readSponsorValue(SPONSOR_ENV_KEYS.blurb, SPONSOR_DEFAULTS.blurb),
  });
}
