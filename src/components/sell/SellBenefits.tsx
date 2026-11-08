import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { FeatureGrid } from "@/components/sell/FeatureGrid";

const benefitIds = ["ownPrice", "paidPerSale", "freePreview", "outputExamples", "updates"] as const;

export function SellBenefits(): ReactElement {
  const t = useTranslations("sell.benefits");

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
