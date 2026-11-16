import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { RouteIndexLayout } from "@/components/shared/RouteIndexLayout/RouteIndexLayout";
import { Faq } from "@/components/homepage/Faq/Faq";
import { FeaturedPrompts } from "@/components/homepage/FeaturedPrompts/FeaturedPrompts";
import { Hero } from "@/components/homepage/Hero/Hero";
import { homeSections } from "@/components/homepage/homeSections/homeSections";
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

/** Sections follow `homeSections`, the order of the route's index. */
export default function HomePage(): ReactElement {
  const t = useTranslations("home.outline");
  const sections = homeSections.map((section) => ({
    id: section.id,
    level: section.level,
    label: t(`sections.${section.key}`),
  }));

  return (
    <RouteIndexLayout sections={sections} file_name={t("file")} content_class_name={styles.content}>
      <Hero />
      <FeaturedPrompts />
      <HowItWorks />
      <WhyMarkdown />
      <UploadCta />
      <Faq />
    </RouteIndexLayout>
  );
}
