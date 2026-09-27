export const INDUSTRY_SLUGS = [
  "general-contractor",
  "carpentry",
  "handyman",
  "landscaping",
  "plumbing",
  "residential-construction",
  "electrical",
  "hvac",
  "painting",
  "roofing",
] as const;

export type IndustrySlug = (typeof INDUSTRY_SLUGS)[number];
