import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import type { RouteIndexSection } from "@/components/shared/RouteIndex/RouteIndex";
import { RouteIndexLayout } from "@/components/shared/RouteIndexLayout/RouteIndexLayout";
import { PostPromptSection } from "@/components/upload/PostPromptSection/PostPromptSection";
import { UploadBenefits } from "@/components/upload/UploadBenefits/UploadBenefits";
import { UploadHero } from "@/components/upload/UploadHero/UploadHero";
import { UploadListingTips } from "@/components/upload/UploadListingTips/UploadListingTips";
import { UploadSteps } from "@/components/upload/UploadSteps/UploadSteps";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("upload.meta");

  return { title: t("title"), description: t("description") };
}

/** Welcome page for people who want to post a prompt of their own, with the posting form at the bottom. */
export default function UploadPage(): ReactElement {
  const t = useTranslations("upload.outline");
  // The ids are the ones on the section elements below, in the order they appear.
  const sections: RouteIndexSection[] = [
    { id: "intro", level: 1, label: t("sections.intro") },
    { id: "benefits", level: 2, label: t("sections.benefits") },
    { id: "listing-tips", level: 2, label: t("sections.listingTips") },
    { id: "steps", level: 2, label: t("sections.steps") },
    { id: "post-prompt", level: 2, label: t("sections.postPrompt") },
  ];

  return (
    <RouteIndexLayout sections={sections} file_name={t("file")} content_class_name={styles.content}>
      <UploadHero />
      <UploadBenefits />
      <UploadListingTips />
      <UploadSteps />
      <PostPromptSection />
    </RouteIndexLayout>
  );
}
