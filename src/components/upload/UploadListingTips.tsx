import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { FeatureGrid } from "@/components/upload/FeatureGrid";

const tipIds = ["oneJob", "testedTools", "technologies", "results"] as const;

export function UploadListingTips(): ReactElement {
  const t = useTranslations("upload.listing");

  return (
    <FeatureGrid
      id="listing-tips"
      eyebrow={t("eyebrow")}
      title={t("title")}
      lead={t("lead")}
      items={tipIds.map((id) => ({ id, title: t(`tips.${id}.title`), text: t(`tips.${id}.text`) }))}
    />
  );
}
