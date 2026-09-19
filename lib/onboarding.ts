import { localizedPath, type Locale } from "@/lib/i18n";

export const EMPLOYEE_COUNT_KEYS = [
  "just-me",
  "2-5",
  "6-10",
  "11-25",
  "26-50",
  "51-200",
  "200+",
] as const;

export const INDUSTRY_KEYS = [
  "design",
  "photo-video",
  "writing",
  "marketing",
  "trades",
  "consulting",
  "software",
  "other",
] as const;

export type EmployeeCountKey = (typeof EMPLOYEE_COUNT_KEYS)[number];
export type IndustryKey = (typeof INDUSTRY_KEYS)[number];

export const COUNTRY_OPTIONS = [
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { iso: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { iso: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { iso: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { iso: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿" },
  { iso: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { iso: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { iso: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { iso: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { iso: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
  { iso: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
  { iso: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { iso: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
  { iso: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { iso: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { iso: "SE", name: "Sweden", dial: "+46", flag: "🇸🇪" },
  { iso: "NO", name: "Norway", dial: "+47", flag: "🇳🇴" },
  { iso: "DK", name: "Denmark", dial: "+45", flag: "🇩🇰" },
  { iso: "FI", name: "Finland", dial: "+358", flag: "🇫🇮" },
  { iso: "CH", name: "Switzerland", dial: "+41", flag: "🇨🇭" },
  { iso: "AT", name: "Austria", dial: "+43", flag: "🇦🇹" },
  { iso: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪" },
  { iso: "PL", name: "Poland", dial: "+48", flag: "🇵🇱" },
  { iso: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
  { iso: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { iso: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
  { iso: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
  { iso: "CL", name: "Chile", dial: "+56", flag: "🇨🇱" },
] as const;

export const DEFAULT_COUNTRY_ISO = "US";

export type OnboardingUser = {
  name?: string | null;
  phone?: string | null;
  businessName?: string | null;
  employeeCount?: string | null;
  industry?: string | null;
  onboardingComplete?: boolean | null;
};

export function isEmployeeCountKey(value: string): value is EmployeeCountKey {
  return (EMPLOYEE_COUNT_KEYS as readonly string[]).includes(value);
}

export function isIndustryKey(value: string): value is IndustryKey {
  return (INDUSTRY_KEYS as readonly string[]).includes(value);
}

export function needsOnboarding(user: OnboardingUser) {
  return user.onboardingComplete === false;
}

export function hasOnboardingProfile(user: OnboardingUser) {
  return Boolean(user.name?.trim() && user.phone?.trim());
}

export function hasOnboardingBusiness(user: OnboardingUser) {
  return Boolean(
    user.businessName?.trim() &&
      user.employeeCount &&
      isEmployeeCountKey(user.employeeCount) &&
      user.industry &&
      isIndustryKey(user.industry),
  );
}

export function nextOnboardingPath(user: OnboardingUser, locale: Locale, editProfile = false) {
  if (!needsOnboarding(user)) return "/dashboard";
  if (editProfile || !hasOnboardingProfile(user)) {
    return localizedPath(locale, "/onboarding");
  }
  return localizedPath(locale, "/onboarding/business");
}

export function postAuthPath(user: OnboardingUser, locale: Locale) {
  return nextOnboardingPath(user, locale);
}

export function splitName(name?: string | null) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

export function joinName(firstName: string, lastName = "") {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function composePhone(countryIso: string, nationalNumber: string) {
  const country =
    COUNTRY_OPTIONS.find((item) => item.iso === countryIso) ??
    COUNTRY_OPTIONS.find((item) => item.iso === DEFAULT_COUNTRY_ISO)!;
  const digits = digitsOnly(nationalNumber);
  return `${country.dial}${digits}`;
}

export function parsePhone(phone?: string | null): { countryIso: string; nationalNumber: string } {
  const raw = (phone ?? "").trim();
  if (!raw) return { countryIso: DEFAULT_COUNTRY_ISO, nationalNumber: "" };
  const compact = raw.startsWith("+") ? raw : `+${digitsOnly(raw)}`;
  const ranked = [...COUNTRY_OPTIONS].sort((a, b) => b.dial.length - a.dial.length);
  const match = ranked.find((item) => compact.startsWith(item.dial));
  if (!match) {
    return { countryIso: DEFAULT_COUNTRY_ISO, nationalNumber: digitsOnly(raw) };
  }
  return {
    countryIso: match.iso,
    nationalNumber: compact.slice(match.dial.length),
  };
}

export function isValidPhone(phone: string) {
  const digits = digitsOnly(phone);
  return digits.length >= 8 && digits.length <= 15;
}

export function markNewUserOnboarding() {
  return { onboardingComplete: false as const };
}
