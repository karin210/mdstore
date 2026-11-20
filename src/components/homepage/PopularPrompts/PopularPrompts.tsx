import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { FeaturedPromptGrid } from "@/components/homepage/FeaturedPromptGrid/FeaturedPromptGrid";
import { SecondaryButton } from "@/components/shared/SecondaryButton/SecondaryButton";
import { list_popular_prompts } from "@/server/prompts/popularPrompts";
import styles from "./PopularPrompts.module.css";

/** Loads the ranked posts (cached and shared by every visitor) and shows them, or an empty state. */
export async function PopularPrompts(): Promise<ReactElement> {
  const prompts = await list_popular_prompts();

  if (prompts.length === 0) {
    const t = await getTranslations("home.featured");
    return (
      <div className={styles.empty}>
        <p>{t("empty")}</p>
        <SecondaryButton href="/upload">{t("emptyAction")}</SecondaryButton>
      </div>
    );
  }
  return <FeaturedPromptGrid prompts={prompts} />;
}
