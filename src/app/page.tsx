import type { Metadata } from "next";
import type { ReactElement } from "react";
import { Faq } from "@/components/homepage/Faq";
import { FeaturedPrompts } from "@/components/homepage/FeaturedPrompts";
import { Hero } from "@/components/homepage/Hero";
import { HowItWorks } from "@/components/homepage/HowItWorks";
import { SellerCta } from "@/components/homepage/SellerCta";
import { WhyMarkdown } from "@/components/homepage/WhyMarkdown";
import { siteConfig } from "@/lib/site";
import styles from "./page.module.css";

export const metadata: Metadata = {
  // Home page leads with the brand (see CLAUDE.md "Page Titles").
  title: { absolute: `${siteConfig.name}${siteConfig.titleSeparator}Buy and sell coding prompts as .md files` },
};

export default function HomePage(): ReactElement {
  return (
    <main className={styles.main}>
      <Hero />
      <FeaturedPrompts />
      <HowItWorks />
      <WhyMarkdown />
      <SellerCta />
      <Faq />
    </main>
  );
}
