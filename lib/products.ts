import { ESTIMATE_MARKETING_PATH } from "./estimates";
import { localizedPath, type Locale } from "./i18n";
import { CONTACT_PATH } from "./site";

/** Where a Products-grid item sends people.
 *  `soon` is shown on the page and left unlinked — that capability is not in the product yet.
 *  App paths are real dashboard routes; guests go through login with a callback.
 */
export type ProductLink =
  | { kind: "locale"; path: string }
  | { kind: "app"; path: string; intent: "register" | "signin" }
  | { kind: "soon" };

export const PRODUCT_COLUMNS: { heading: ProductLink; items: readonly ProductLink[] }[] = [
  {
    heading: { kind: "locale", path: ESTIMATE_MARKETING_PATH },
    items: [
      { kind: "locale", path: ESTIMATE_MARKETING_PATH },
      { kind: "app", path: "/dashboard/invoices", intent: "register" },
      { kind: "soon" },
    ],
  },
  {
    heading: { kind: "app", path: "/dashboard/jobs", intent: "register" },
    items: [
      { kind: "app", path: "/dashboard/jobs", intent: "register" },
      { kind: "app", path: "/dashboard/clients", intent: "register" },
      { kind: "soon" },
    ],
  },
  {
    heading: { kind: "app", path: "/dashboard/settings/quickbooks", intent: "signin" },
    items: [
      { kind: "soon" },
      { kind: "soon" },
      { kind: "app", path: "/dashboard/settings/quickbooks", intent: "signin" },
    ],
  },
  {
    heading: { kind: "locale", path: CONTACT_PATH },
    items: [{ kind: "soon" }, { kind: "soon" }, { kind: "soon" }],
  },
];

export const REWARDS_LINK: ProductLink = {
  kind: "app",
  path: "/dashboard/settings/refer",
  intent: "signin",
};

export function productHref(link: ProductLink, signedIn: boolean, locale: Locale): string | null {
  if (link.kind === "soon") return null;
  if (link.kind === "locale") return localizedPath(locale, link.path);
  if (signedIn) return link.path;
  const params = new URLSearchParams({ callbackUrl: link.path });
  if (link.intent === "register") params.set("mode", "register");
  return `${localizedPath(locale, "/login")}?${params.toString()}`;
}
