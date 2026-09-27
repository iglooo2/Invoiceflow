export const RESOURCE_SLUGS = ["workshop", "calculators", "estimate-templates", "invoice-templates"] as const;

export type ResourceSlug = (typeof RESOURCE_SLUGS)[number];
