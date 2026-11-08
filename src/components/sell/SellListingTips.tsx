import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { FeatureGrid } from "@/components/sell/FeatureGrid";

const tipIds = ["oneJob", "testedTools", "technologies", "results"] as const;

export function SellListingTips(): ReactElement {
  const t = useTranslations("sell.listing");

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
