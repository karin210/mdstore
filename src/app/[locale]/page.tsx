import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { Faq } from "@/components/homepage/Faq";
import { FeaturedPrompts } from "@/components/homepage/FeaturedPrompts";
import { Hero } from "@/components/homepage/Hero";
import { HowItWorks } from "@/components/homepage/HowItWorks";
import { UploadCta } from "@/components/homepage/UploadCta";
import { WhyMarkdown } from "@/components/homepage/WhyMarkdown";
import { siteConfig } from "@/lib/site";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home.meta");

  // Home page leads with the brand (see CLAUDE.md "Page Titles").
  return { title: { absolute: `${siteConfig.name}${siteConfig.titleSeparator}${t("title")}` } };
}

export default function HomePage(): ReactElement {
  return (
    <main className={styles.main}>
      <Hero />
      <FeaturedPrompts />
      <HowItWorks />
      <WhyMarkdown />
      <UploadCta />
      <Faq />
    </main>
  );
}
