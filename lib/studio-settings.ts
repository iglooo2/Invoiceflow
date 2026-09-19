import { isMissingDatabaseSchemaError } from "./db-errors";
import { isEmployeeCountKey, isIndustryKey } from "./onboarding";

export const SETTINGS_SCHEMA_WARNING =
  "Postgres is missing Studio Settings tables (StudioSettings, TaxRate, Contract). From a laptop, against the Neon direct/unpooled URL (not *-pooler.*): npm run db:push:prod";

export const DEFAULT_EMAIL_ESTIMATE =
  "We are excited about the possibility of working with you.";
export const DEFAULT_EMAIL_INVOICE = "Thanks for your business!";

export const STUDIO_CURRENCIES = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
  { value: "SEK", label: "Swedish Krona (SEK)" },
  { value: "NOK", label: "Norwegian Krone (NOK)" },
  { value: "DKK", label: "Danish Krone (DKK)" },
  { value: "CHF", label: "Swiss Franc (CHF)" },
  { value: "MXN", label: "Mexican Peso (MXN)" },
  { value: "BRL", label: "Brazilian Real (BRL)" },
] as const;

export const STUDIO_LOCALES = [
  { value: "en-US", label: "United States" },
  { value: "en-GB", label: "United Kingdom" },
  { value: "en-CA", label: "Canada" },
  { value: "en-AU", label: "Australia" },
  { value: "sv-SE", label: "Sweden" },
  { value: "de-DE", label: "Germany" },
  { value: "fr-FR", label: "France" },
  { value: "es-ES", label: "Spain" },
  { value: "pt-BR", label: "Brazil" },
  { value: "pt-PT", label: "Portugal" },
] as const;

export const STUDIO_COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Sweden",
  "Germany",
  "France",
  "Spain",
  "Portugal",
  "Brazil",
  "Mexico",
  "Ireland",
  "Netherlands",
  "Norway",
  "Denmark",
  "Switzerland",
  "New Zealand",
  "Italy",
] as const;

export const STUDIO_INDUSTRIES = [
  "Carpentry",
  "Design studio",
  "Video production",
  "Writing & editorial",
  "Photography",
  "Consulting",
  "Construction",
  "Electrical",
  "Plumbing",
  "Landscaping",
  "HVAC",
  "Painting",
  "Other",
] as const;

export const SETTINGS_FILE_MAX_BYTES = 400_000;

export type StudioSettingsRecord = {
  firstName: string;
  lastName: string;
  defaultCurrency: string;
  documentLocale: string;
  logoDataUrl: string;
  businessPhone2: string;
  businessFax: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  taxNumber: string;
  industry: string;
  licenseFileName: string;
  licenseDataUrl: string;
  insuranceFileName: string;
  insuranceDataUrl: string;
  facebookUrl: string;
  googleBusinessUrl: string;
  instagramUrl: string;
  yelpUrl: string;
  emailEstimateMessage: string;
  emailInvoiceMessage: string;
  notifyClientOpensEmail: boolean;
  notifyEmailNotDelivered: boolean;
  notifyClientSigns: boolean;
  notifyClientViews: boolean;
  organizeLineItemSections: boolean;
  paymentTermsDays: number;
  footerMessage: string;
  defaultMarkupPercent: number;
  referralCode: string;
};

export const EMPTY_STUDIO_SETTINGS: StudioSettingsRecord = {
  firstName: "",
  lastName: "",
  defaultCurrency: "USD",
  documentLocale: "en-US",
  logoDataUrl: "",
  businessPhone2: "",
  businessFax: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  country: "",
  postalCode: "",
  taxNumber: "",
  industry: "",
  licenseFileName: "",
  licenseDataUrl: "",
  insuranceFileName: "",
  insuranceDataUrl: "",
  facebookUrl: "",
  googleBusinessUrl: "",
  instagramUrl: "",
  yelpUrl: "",
  emailEstimateMessage: DEFAULT_EMAIL_ESTIMATE,
  emailInvoiceMessage: DEFAULT_EMAIL_INVOICE,
  notifyClientOpensEmail: true,
  notifyEmailNotDelivered: true,
  notifyClientSigns: true,
  notifyClientViews: true,
  organizeLineItemSections: false,
  paymentTermsDays: 0,
  footerMessage: "",
  defaultMarkupPercent: 0,
  referralCode: "",
};

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

function text(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

function optional(formData: FormData, name: string) {
  return text(formData, name) || "";
}

function checked(formData: FormData, name: string) {
  const raw = String(formData.get(name) || "").toLowerCase();
  return raw === "on" || raw === "true" || raw === "1";
}

export function splitPersonName(name?: string | null): { firstName: string; lastName: string } {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function displayPersonName(user: {
  name?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const combined = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return combined || user.name || user.email || "Account";
}

export function composeBusinessAddress(parts: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
}) {
  const cityLine = [parts.city, parts.region, parts.postalCode].filter(Boolean).join(", ");
  return [parts.addressLine1, parts.addressLine2, cityLine, parts.country]
    .map((line) => (line ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

export function dueDateFromPaymentTerms(issueDate: Date, paymentTermsDays: number) {
  const days = Number.isFinite(paymentTermsDays) ? Math.max(0, Math.round(paymentTermsDays)) : 0;
  const due = new Date(issueDate);
  due.setDate(due.getDate() + days);
  return due;
}

export function paymentTermsLabel(days: number) {
  if (!days) return "Due Upon Receipt";
  return `Net ${days}`;
}

export function allowedCurrency(value: string) {
  return STUDIO_CURRENCIES.some((item) => item.value === value) ? value : "USD";
}

export function allowedLocale(value: string) {
  return STUDIO_LOCALES.some((item) => item.value === value) ? value : "en-US";
}

export function allowedIndustry(value: string) {
  return isIndustryKey(value) ? value : "";
}

export function allowedEmployeeCount(value: string) {
  return isEmployeeCountKey(value) ? value : "";
}

export function normalizeStudioSettings(row: unknown): StudioSettingsRecord {
  const record = (row ?? {}) as Record<string, unknown>;
  const str = (key: keyof StudioSettingsRecord, fallback = "") =>
    typeof record[key] === "string" ? (record[key] as string) : fallback;
  const bool = (key: keyof StudioSettingsRecord, fallback: boolean) =>
    typeof record[key] === "boolean" ? (record[key] as boolean) : fallback;
  const num = (key: keyof StudioSettingsRecord, fallback: number) =>
    typeof record[key] === "number" && Number.isFinite(record[key]) ? (record[key] as number) : fallback;
  return {
    firstName: str("firstName"),
    lastName: str("lastName"),
    defaultCurrency: allowedCurrency(str("defaultCurrency", "USD")),
    documentLocale: allowedLocale(str("documentLocale", "en-US")),
    logoDataUrl: str("logoDataUrl"),
    businessPhone2: str("businessPhone2"),
    businessFax: str("businessFax"),
    addressLine1: str("addressLine1"),
    addressLine2: str("addressLine2"),
    city: str("city"),
    region: str("region"),
    country: str("country"),
    postalCode: str("postalCode"),
    taxNumber: str("taxNumber"),
    industry: str("industry"),
    licenseFileName: str("licenseFileName"),
    licenseDataUrl: str("licenseDataUrl"),
    insuranceFileName: str("insuranceFileName"),
    insuranceDataUrl: str("insuranceDataUrl"),
    facebookUrl: str("facebookUrl"),
    googleBusinessUrl: str("googleBusinessUrl"),
    instagramUrl: str("instagramUrl"),
    yelpUrl: str("yelpUrl"),
    emailEstimateMessage: str("emailEstimateMessage", DEFAULT_EMAIL_ESTIMATE) || DEFAULT_EMAIL_ESTIMATE,
    emailInvoiceMessage: str("emailInvoiceMessage", DEFAULT_EMAIL_INVOICE) || DEFAULT_EMAIL_INVOICE,
    notifyClientOpensEmail: bool("notifyClientOpensEmail", true),
    notifyEmailNotDelivered: bool("notifyEmailNotDelivered", true),
    notifyClientSigns: bool("notifyClientSigns", true),
    notifyClientViews: bool("notifyClientViews", true),
    organizeLineItemSections: bool("organizeLineItemSections", false),
    paymentTermsDays: Math.max(0, Math.round(num("paymentTermsDays", 0))),
    footerMessage: str("footerMessage"),
    defaultMarkupPercent: Math.max(0, num("defaultMarkupPercent", 0)),
    referralCode: str("referralCode"),
  };
}

export function isSettingsSchemaError(error: unknown) {
  return isMissingDatabaseSchemaError(error);
}

export function shouldNotify(
  settings: Pick<
    StudioSettingsRecord,
    "notifyClientOpensEmail" | "notifyClientSigns" | "notifyClientViews"
  >,
  event: "opens" | "signs" | "views",
) {
  if (event === "opens") return settings.notifyClientOpensEmail || settings.notifyClientViews;
  if (event === "views") return settings.notifyClientViews || settings.notifyClientOpensEmail;
  return settings.notifyClientSigns;
}

export type AccountFormInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  defaultCurrency: string;
  documentLocale: string;
};

export function parseAccountForm(formData: FormData): ParseResult<AccountFormInput> {
  const firstName = optional(formData, "firstName");
  const lastName = optional(formData, "lastName");
  const email = optional(formData, "email").toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Enter a valid email address." };
  }
  if (password || confirmPassword) {
    if (password.length < 8) {
      return { success: false, error: "New password must be at least 8 characters." };
    }
    if (password !== confirmPassword) {
      return { success: false, error: "Password confirmation does not match." };
    }
  }
  return {
    success: true,
    data: {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      defaultCurrency: allowedCurrency(optional(formData, "defaultCurrency") || "USD"),
      documentLocale: allowedLocale(optional(formData, "documentLocale") || "en-US"),
    },
  };
}

export type CompanyFormInput = {
  businessName: string;
  businessPhone: string;
  businessPhone2: string;
  businessFax: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  taxNumber: string;
  businessEmail: string;
  website: string;
  industry: string;
  employeeCount: string;
  clearLogo: boolean;
  businessAddress: string;
};

export function parseCompanyForm(formData: FormData): ParseResult<CompanyFormInput> {
  const addressLine1 = optional(formData, "addressLine1");
  const addressLine2 = optional(formData, "addressLine2");
  const city = optional(formData, "city");
  const region = optional(formData, "region");
  const country = optional(formData, "country");
  const postalCode = optional(formData, "postalCode");
  return {
    success: true,
    data: {
      businessName: optional(formData, "businessName"),
      businessPhone: optional(formData, "businessPhone"),
      businessPhone2: optional(formData, "businessPhone2"),
      businessFax: optional(formData, "businessFax"),
      addressLine1,
      addressLine2,
      city,
      region,
      country,
      postalCode,
      taxNumber: optional(formData, "taxNumber"),
      businessEmail: optional(formData, "businessEmail"),
      website: optional(formData, "website"),
      industry: allowedIndustry(optional(formData, "industry")),
      employeeCount: allowedEmployeeCount(optional(formData, "employeeCount")),
      clearLogo: checked(formData, "clearLogo"),
      businessAddress: composeBusinessAddress({
        addressLine1,
        addressLine2,
        city,
        region,
        postalCode,
        country,
      }),
    },
  };
}

export type LinksFormInput = {
  website: string;
  facebookUrl: string;
  googleBusinessUrl: string;
  instagramUrl: string;
  yelpUrl: string;
  clearLicense: boolean;
  clearInsurance: boolean;
};

export function parseLinksForm(formData: FormData): ParseResult<LinksFormInput> {
  return {
    success: true,
    data: {
      website: optional(formData, "website"),
      facebookUrl: optional(formData, "facebookUrl"),
      googleBusinessUrl: optional(formData, "googleBusinessUrl"),
      instagramUrl: optional(formData, "instagramUrl"),
      yelpUrl: optional(formData, "yelpUrl"),
      clearLicense: checked(formData, "clearLicense"),
      clearInsurance: checked(formData, "clearInsurance"),
    },
  };
}

export type PreferencesFormInput = {
  emailEstimateMessage: string;
  emailInvoiceMessage: string;
  notifyClientOpensEmail: boolean;
  notifyEmailNotDelivered: boolean;
  notifyClientSigns: boolean;
  notifyClientViews: boolean;
};

export function parsePreferencesForm(formData: FormData): ParseResult<PreferencesFormInput> {
  return {
    success: true,
    data: {
      emailEstimateMessage: optional(formData, "emailEstimateMessage") || DEFAULT_EMAIL_ESTIMATE,
      emailInvoiceMessage: optional(formData, "emailInvoiceMessage") || DEFAULT_EMAIL_INVOICE,
      notifyClientOpensEmail: checked(formData, "notifyClientOpensEmail"),
      notifyEmailNotDelivered: checked(formData, "notifyEmailNotDelivered"),
      notifyClientSigns: checked(formData, "notifyClientSigns"),
      notifyClientViews: checked(formData, "notifyClientViews"),
    },
  };
}

export type DocumentsFormInput = {
  organizeLineItemSections: boolean;
  paymentTermsDays: number;
  footerMessage: string;
};

export function parseDocumentsForm(formData: FormData): ParseResult<DocumentsFormInput> {
  const days = Number.parseInt(String(formData.get("paymentTermsDays") || "0"), 10);
  if (!Number.isFinite(days) || days < 0 || days > 365) {
    return { success: false, error: "Payment terms must be between 0 and 365 days." };
  }
  return {
    success: true,
    data: {
      organizeLineItemSections: checked(formData, "organizeLineItemSections"),
      paymentTermsDays: days,
      footerMessage: optional(formData, "footerMessage"),
    },
  };
}

export type MarkupFormInput = { defaultMarkupPercent: number };

export function parseMarkupForm(formData: FormData): ParseResult<MarkupFormInput> {
  const rate = Number.parseFloat(String(formData.get("defaultMarkupPercent") || "0"));
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    return { success: false, error: "Markup must be between 0 and 100%." };
  }
  return { success: true, data: { defaultMarkupPercent: rate } };
}

export type TaxFormInput = { name: string; rate: number };

export function parseTaxForm(formData: FormData): ParseResult<TaxFormInput> {
  const name = optional(formData, "name");
  const rate = Number.parseFloat(String(formData.get("rate") || ""));
  if (!name) return { success: false, error: "Tax name is required." };
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    return { success: false, error: "Tax rate must be between 0 and 100." };
  }
  return { success: true, data: { name, rate } };
}

export type ContractFormInput = {
  id: string;
  name: string;
  details: string;
  defaultForEstimates: boolean;
  defaultForInvoices: boolean;
};

export function parseContractForm(formData: FormData): ParseResult<ContractFormInput> {
  const name = optional(formData, "name");
  const details = String(formData.get("details") || "").trim();
  if (!name) return { success: false, error: "Contract name is required." };
  if (name.length > 120) return { success: false, error: "Contract name is too long." };
  if (details.length > 20_000) return { success: false, error: "Contract details are too long." };
  return {
    success: true,
    data: {
      id: optional(formData, "contractId"),
      name,
      details,
      defaultForEstimates: checked(formData, "defaultForEstimates"),
      defaultForInvoices: checked(formData, "defaultForInvoices"),
    },
  };
}

export function parseReferralGenerateForm(formData: FormData): ParseResult<{ accepted: true }> {
  if (!checked(formData, "agreeTerms")) {
    return { success: false, error: "Agree to the referral terms before generating your link." };
  }
  return { success: true, data: { accepted: true } };
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]);
const DOC_TYPES = new Set([
  ...IMAGE_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function fileFromForm(formData: FormData, name: string) {
  const value = formData.get(name);
  return value instanceof File ? value : null;
}

export async function fileToStoredUpload(
  file: File | null,
  kind: "image" | "document",
): Promise<ParseResult<{ name: string; dataUrl: string } | null>> {
  if (!file || file.size === 0) return { success: true, data: null };
  if (file.size > SETTINGS_FILE_MAX_BYTES) {
    return { success: false, error: "That file is larger than 400 KB. Choose a smaller image or PDF." };
  }
  const allowed = kind === "image" ? IMAGE_TYPES : DOC_TYPES;
  if (file.type && !allowed.has(file.type)) {
    return { success: false, error: "Use a PNG, JPG, WebP, or PDF under 400 KB." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary);
  const mime = file.type || "application/octet-stream";
  return {
    success: true,
    data: { name: file.name.slice(0, 180), dataUrl: `data:${mime};base64,${base64}` },
  };
}

export function accountNameFromParts(firstName: string, lastName: string, fallback?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || fallback || null;
}
