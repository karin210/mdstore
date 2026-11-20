"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactElement } from "react";
import { PromptCard } from "@/components/homepage/PromptCard/PromptCard";
import { promptCategories, type PromptCategory } from "@/data/prompts";
import type { PromptCardData } from "@/lib/promptCard";
import utility_styles from "@/styles/utilities.module.css";
import styles from "./FeaturedPromptGrid.module.css";

type CategoryFilter = PromptCategory | "all";

interface FeaturedPromptGridProps {
  /** Already ranked (see list_popular_prompts); the grid keeps that order. */
  prompts: PromptCardData[];
}

/** The popular prompts as cards, with category filters (only categories that have a card). */
export function FeaturedPromptGrid({ prompts }: FeaturedPromptGridProps): ReactElement {
  const t = useTranslations("home.featured");
  const tCategories = useTranslations("prompts.categories");
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");

  const filters: CategoryFilter[] = [
    "all",
    ...promptCategories.filter((category) => prompts.some((prompt) => prompt.category === category)),
  ];
  const visiblePrompts =
    activeFilter === "all" ? prompts : prompts.filter((prompt) => prompt.category === activeFilter);

  return (
    <>
      <div className={styles.filters} role="group" aria-label={t("filterLabel")}>
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={styles.filter}
            aria-pressed={activeFilter === filter}
            onClick={() => setActiveFilter(filter)}
          >
            {filter === "all" ? t("all") : tCategories(filter)}
          </button>
        ))}
      </div>

      <p className={utility_styles.visuallyHidden} role="status">
        {t("showing", { count: visiblePrompts.length })}
      </p>

      <ul className={styles.grid}>
        {visiblePrompts.map((prompt) => (
          <li key={prompt.slug} className={styles.item}>
            <PromptCard prompt={prompt} />
          </li>
        ))}
      </ul>
    </>
  );
}
