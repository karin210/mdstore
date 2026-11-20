import { useTranslations } from "next-intl";
import { Suspense, type ReactElement } from "react";
import { PopularPrompts } from "@/components/homepage/PopularPrompts/PopularPrompts";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock/SkeletonBlock";
import { POPULAR_PROMPT_COUNT } from "@/server/prompts/popularPrompts";
import section_styles from "@/styles/section.module.css";
import loading_styles from "./FeaturedPrompts.module.css";

/**
 * "The most popular prompts": the best-rated approved posts (newest first among equals, then the
 * newest unrated ones), up to POPULAR_PROMPT_COUNT. The heading is static; the cards stream in.
 */
export function FeaturedPrompts(): ReactElement {
  const t = useTranslations("home.featured");

  return (
    <section id="featured" className={section_styles.pageSection} aria-labelledby="featured-title">
      <header className={section_styles.sectionHeading} data-md-level="2">
        <p className={section_styles.eyebrow}>{t("eyebrow")}</p>
        <h2 id="featured-title">{t("title")}</h2>
        <p>{t("lead")}</p>
      </header>

      <Suspense fallback={<PopularPromptsLoading label={t("loading")} />}>
        <PopularPrompts />
      </Suspense>
    </section>
  );
}

function PopularPromptsLoading({ label }: { label: string }): ReactElement {
  return (
    <div className={loading_styles.loading} role="status" aria-label={label}>
      {Array.from({ length: POPULAR_PROMPT_COUNT }, (_, index) => (
        <div key={index} className={loading_styles.placeholder}>
          <SkeletonBlock width="40%" />
          <SkeletonBlock width="80%" height="1.5em" />
          <SkeletonBlock height="3em" />
          <SkeletonBlock width="30%" height="2em" rounded />
        </div>
      ))}
    </div>
  );
}
