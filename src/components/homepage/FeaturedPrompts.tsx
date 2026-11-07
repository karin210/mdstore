"use client";

import { useState, type ReactElement } from "react";
import { PromptCard } from "@/components/homepage/PromptCard";
import { PromptPreviewDialog } from "@/components/modals/PromptPreviewDialog";
import { featuredPrompts, promptCategories, type PromptCategory, type PromptListing } from "@/data/prompts";
import styles from "./FeaturedPrompts.module.css";

type CategoryFilter = PromptCategory | "All";

// Only offer categories that have at least one listing, so no filter leads to an empty grid.
const filters: CategoryFilter[] = [
  "All",
  ...promptCategories.filter((category) => featuredPrompts.some((prompt) => prompt.category === category)),
];

export function FeaturedPrompts(): ReactElement {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("All");
  const [previewed, setPreviewed] = useState<PromptListing | null>(null);

  const visiblePrompts =
    activeFilter === "All" ? featuredPrompts : featuredPrompts.filter((prompt) => prompt.category === activeFilter);

  return (
    <section id="featured" className="page-section" aria-labelledby="featured-title">
      <header className="section-heading">
        <p className="eyebrow">{"// featured"}</p>
        <h2 id="featured-title">Prompts developers are buying this week</h2>
        <p>Every file opens with a free preview, so you know exactly what your agent will be told.</p>
      </header>

      <div className={styles.filters} role="group" aria-label="Filter by category">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={styles.filter}
            aria-pressed={activeFilter === filter}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <p className="visually-hidden" role="status">
        {`Showing ${visiblePrompts.length} ${visiblePrompts.length === 1 ? "prompt" : "prompts"}`}
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
