"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactElement } from "react";
import { PromptCard } from "@/components/homepage/PromptCard";
import { PromptPreviewDialog } from "@/components/modals/PromptPreviewDialog";
import { featuredPrompts, promptCategories, type PromptCategory, type PromptListing } from "@/data/prompts";
import styles from "./FeaturedPrompts.module.css";

type CategoryFilter = PromptCategory | "all";

// Only offer categories that have at least one listing, so no filter leads to an empty grid.
const filters: CategoryFilter[] = [
  "all",
  ...promptCategories.filter((category) => featuredPrompts.some((prompt) => prompt.category === category)),
];

export function FeaturedPrompts(): ReactElement {
  const t = useTranslations("home.featured");
  const tCategories = useTranslations("prompts.categories");
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [previewed, setPreviewed] = useState<PromptListing | null>(null);

  const visiblePrompts =
    activeFilter === "all" ? featuredPrompts : featuredPrompts.filter((prompt) => prompt.category === activeFilter);

  return (
    <section id="featured" className="page-section" aria-labelledby="featured-title">
      <header className="section-heading">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 id="featured-title">{t("title")}</h2>
        <p>{t("lead")}</p>
      </header>

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

      <p className="visually-hidden" role="status">
        {t("showing", { count: visiblePrompts.length })}
      </p>

      <ul className={styles.grid}>
        {visiblePrompts.map((prompt) => (
          <li key={prompt.slug} className={styles.item}>
            <PromptCard prompt={prompt} onPreview={setPreviewed} />
          </li>
        ))}
      </ul>

      <PromptPreviewDialog prompt={previewed} onClose={() => setPreviewed(null)} />
    </section>
  );
}
