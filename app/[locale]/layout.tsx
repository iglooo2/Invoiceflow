import { LOCALES } from "@/lib/i18n";
import { resolveLocale } from "@/lib/i18n-request";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  resolveLocale((await params).locale);
  return children;
}
