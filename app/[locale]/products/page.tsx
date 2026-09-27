import type { Metadata } from "next";
import { hasSessionCookie } from "@/lib/session-cookie";
import { ProductsGrid } from "@/components/marketing/products-grid";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { getDictionary } from "@/lib/dictionary";
import { marketingCopy } from "@/lib/i18n-request";
import { isLocale, LOCALES, localizedPath } from "@/lib/i18n";
import { PRODUCTS_PATH, SITE_URL } from "@/lib/site";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/products">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.meta.productsTitle,
    description: dict.meta.productsDescription,
    alternates: {
      canonical: `${SITE_URL}${localizedPath(locale, PRODUCTS_PATH)}`,
      languages: Object.fromEntries(
        LOCALES.map((code) => [code === "pt" ? "pt-BR" : code, `${SITE_URL}${localizedPath(code, PRODUCTS_PATH)}`]),
      ),
    },
  };
}

export default async function ProductsPage({ params }: PageProps<"/[locale]/products">) {
  const { locale, dict } = marketingCopy((await params).locale);
  const signedIn = await hasSessionCookie();

  return (
    <div className="landing-canvas">
      <MarketingHeader signedIn={signedIn} locale={locale} path={PRODUCTS_PATH} copy={dict.nav} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-4 pt-8 sm:pt-12">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{dict.meta.productsTitle}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{dict.products.lede}</p>
        <div className="mt-10">
          <ProductsGrid signedIn={signedIn} locale={locale} copy={dict.products} />
        </div>
      </main>
      <MarketingFooter locale={locale} path={PRODUCTS_PATH} copy={dict.nav} />
    </div>
  );
}
