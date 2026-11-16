import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { Faq } from "@/components/homepage/Faq/Faq";
import { FeaturedPrompts } from "@/components/homepage/FeaturedPrompts/FeaturedPrompts";
import { Hero } from "@/components/homepage/Hero/Hero";
import { HomeOutlineRail, HomeStatusBar } from "@/components/homepage/HomeOutline/HomeOutline";
import { HowItWorks } from "@/components/homepage/HowItWorks/HowItWorks";
import { UploadCta } from "@/components/homepage/UploadCta/UploadCta";
import { WhyMarkdown } from "@/components/homepage/WhyMarkdown/WhyMarkdown";
import { siteConfig } from "@/lib/site";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home.meta");

  // Home page leads with the brand (see CLAUDE.md "Page Titles").
  return { title: { absolute: `${siteConfig.name}${siteConfig.titleSeparator}${t("title")}` } };
}

/** Sections follow `homeSections` (the outline's order); each ends with a "Next" link to the following one. */
export default function HomePage(): ReactElement {
  return (
    <main className={styles.main}>
      <HomeOutlineRail />
      <div className={styles.content}>
        <Hero />
        <FeaturedPrompts />
        <HowItWorks />
        <WhyMarkdown />
        <UploadCta />
        <Faq />
        <HomeStatusBar />
      </div>
    </main>
  );
}
