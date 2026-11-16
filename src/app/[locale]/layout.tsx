import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import type { ReactElement, ReactNode } from "react";
import { LanguageBanner } from "@/components/global/LanguageBanner/LanguageBanner";
import { SiteFooter } from "@/components/global/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/global/SiteHeader/SiteHeader";
import { routing } from "@/i18n/routing";
import { siteConfig, titleTemplate } from "@/lib/site";
import "@/styles/globals.css";

/** Display font for page and section headings. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

/** Sober font for body copy, controls and modal headings. */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/** Monospace font for file names and Markdown excerpts. */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** One prerendered tree per locale. */
export function generateStaticParams(): { locale: string }[] {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");

  return {
    title: {
      template: titleTemplate,
      default: siteConfig.name,
    },
    description: t("description"),
    // Static files live in public/; the icon link is declared here instead of app/favicon.ico.
    // The SVG (the logo mark, theme-aware) for modern browsers, the .ico as the fallback.
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }): Promise<ReactElement> {
  const locale = await localeParam();
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} className={`${bricolage.variable} ${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <NextIntlClientProvider>
          <SiteHeader />
          <LanguageBanner />
          {children}
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
