import type { useTranslations } from "next-intl";
import type { RouteIndexSection } from "@/components/shared/RouteIndex/RouteIndex";

type OutlineTranslator = ReturnType<typeof useTranslations<"promptDetail.outline">>;

/**
 * The route index of a listing, for /prompts/[slug] and /upload/preview (which shows the same listing).
 * The ids are the ones on the blocks in PromptListing, OutputExamples and TestedModels, in reading order.
 */
export function get_listing_sections(t: OutlineTranslator): RouteIndexSection[] {
  return [
    { id: "overview", level: 1, label: t("sections.overview") },
    { id: "summary", level: 2, label: t("sections.summary") },
    { id: "meant-for", level: 2, label: t("sections.meantFor") },
    { id: "highlights", level: 2, label: t("sections.highlights") },
    { id: "output-examples", level: 2, label: t("sections.outputExamples") },
    { id: "tested-models", level: 2, label: t("sections.testedModels") },
    { id: "preview", level: 2, label: t("sections.preview") },
    { id: "usage", level: 2, label: t("sections.usage") },
    { id: "ratings", level: 2, label: t("sections.ratings") },
  ];
}
