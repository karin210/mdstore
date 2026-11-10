import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { FeatureGrid } from "@/components/upload/FeatureGrid";

const benefitIds = ["ownPage", "freePreview", "credit", "outputExamples", "plainMarkdown"] as const;

export function UploadBenefits(): ReactElement {
  const t = useTranslations("upload.benefits");

  return (
    <FeatureGrid
      id="benefits"
      eyebrow={t("eyebrow")}
      title={t("title")}
      lead={t("lead")}
      items={benefitIds.map((id) => ({ id, title: t(`items.${id}.title`), text: t(`items.${id}.text`) }))}
    />
  );
}
