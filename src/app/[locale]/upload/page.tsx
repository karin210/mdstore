import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { PostPromptSection } from "@/components/upload/PostPromptSection";
import { UploadBenefits } from "@/components/upload/UploadBenefits";
import { UploadHero } from "@/components/upload/UploadHero";
import { UploadListingTips } from "@/components/upload/UploadListingTips";
import { UploadSteps } from "@/components/upload/UploadSteps";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("upload.meta");

  return { title: t("title"), description: t("description") };
}

/** Welcome page for people who want to post a prompt of their own, with the posting form at the bottom. */
export default function UploadPage(): ReactElement {
  return (
    <main className={styles.main}>
      <UploadHero />
      <UploadBenefits />
      <UploadListingTips />
      <UploadSteps />
      <PostPromptSection />
    </main>
  );
}
