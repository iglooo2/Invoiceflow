import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_STUDIO, SITE_URL } from "@/lib/site";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, htmlLang, isLocale } from "@/lib/i18n";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || SITE_URL),
  title: {
    default: SITE_STUDIO,
    template: `%s · ${SITE_STUDIO}`,
  },
  description: SITE_DESCRIPTION,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const headerLocale = (await headers()).get(LOCALE_HEADER);
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(headerLocale) ? headerLocale : isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <html
      lang={htmlLang(locale)}
      className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
