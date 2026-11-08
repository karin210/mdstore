import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { SellBenefits } from "@/components/sell/SellBenefits";
import { SellClosing } from "@/components/sell/SellClosing";
import { SellHero } from "@/components/sell/SellHero";
import { SellListingTips } from "@/components/sell/SellListingTips";
import { SellSteps } from "@/components/sell/SellSteps";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sell.meta");

  return { title: t("title"), description: t("description") };
}

/** Welcome page for people who want to publish a prompt of their own. */
export default function SellPage(): ReactElement {
  return (
    <main className={styles.main}>
      <SellHero />
      <SellBenefits />
      <SellListingTips />
      <SellSteps />
      <SellClosing />
    </main>
  );
}
