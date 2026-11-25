import { useLocale, useTranslations } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { PrimaryButton } from "@/components/shared/PrimaryButton/PrimaryButton";
import { InlineCode } from "@/components/prompt-detail/InlineCode/InlineCode";
import { OutputExamples } from "@/components/prompt-detail/OutputExamples/OutputExamples";
import { RatingSummary } from "@/components/prompt-detail/RatingSummary/RatingSummary";
import { TestedModels } from "@/components/prompt-detail/TestedModels/TestedModels";
import { downloadHref, isFree } from "@/data/prompts";
import type { Locale } from "@/i18n/routing";
import { formatPrice } from "@/lib/formatPrice";
import type { ListingEmptyField, PromptListingView } from "@/lib/promptView";
import styles from "@/components/prompt-detail/shared/PromptDetail.module.css";
import utility_styles from "@/styles/utilities.module.css";

interface PromptListingProps {
  prompt: PromptListingView;
  /** The category's label, already translated (catalogue and posts store an id; the preview may have none yet). */
  category_label: string;
  /** What the Ratings section shows under its heading. */
  ratings: ReactNode;
  /**
   * The upload preview of a listing that isn't posted yet: the download button goes nowhere and the
   * `empty_fields` the author hasn't filled in yet stay blank, keeping their space.
   */
  is_preview?: boolean;
  empty_fields?: ReadonlySet<ListingEmptyField>;
}

/**
 * The listing itself (`#prompt-content`): header, summary, meant for, highlights, purchase card, output
 * examples, tested with, free preview, suggested use and ratings. One component for /prompts/[slug] and the
 * live preview on /upload/preview, so the preview always looks exactly like the posted page.
 * Synchronous and free of server-only code, so it renders on the server and in the browser alike.
 */
export function PromptListing({
  prompt,
  category_label,
  ratings,
  is_preview = false,
  empty_fields,
}: PromptListingProps): ReactElement {
  const t = useTranslations("promptDetail");
  const tPrompts = useTranslations("prompts");
  const tPrice = useTranslations("price");
  const locale = useLocale() as Locale;
  const free = isFree(prompt);
  const remainingLines = prompt.lineCount - prompt.excerpt.split("\n").length;
  // Null for paid prompts: their content never reaches the page's HTML.
  const fullMarkdown = free ? prompt.fullMarkdown : null;
  const lines = tPrompts("lineCount", { count: prompt.lineCount });

  /** Marks a block the author hasn't filled in yet; it keeps its space (see PromptDetail.module.css). */
  function empty(field: ListingEmptyField): { "data-empty"?: true } {
    return empty_fields?.has(field) ? { "data-empty": true } : {};
  }
  const has_file = !empty_fields?.has("file");
  // Sentences that name the file still read well before the author picks one.
  const file_name_in_text = prompt.fileName || t("unnamedFile");

  return (
    <article id="prompt-content" className={styles.layout} aria-labelledby="prompt-title">
      <header id="overview" className={styles.header}>
        <p className={styles.top}>
          <code className={styles.fileName} {...empty("file")}>
            {prompt.fileName}
          </code>
          <span className={styles.category} {...empty("category")}>
            {category_label}
          </span>
        </p>
        <h1 id="prompt-title" className={styles.title} {...empty("title")}>
          {prompt.title}
        </h1>
        <h2 className={styles.tagline} {...empty("tagline")}>
          {prompt.tagline}
        </h2>
        {prompt.rating && (
          <a className={styles.ratingLink} href="#ratings">
            <RatingSummary rating={prompt.rating} />
          </a>
        )}
      </header>

      <section id="summary" className={styles.summarySection} aria-labelledby="summary-title">
        <h2 id="summary-title" className={styles.sectionTitle}>
          {t("summary")}
        </h2>
        <p className={styles.summary} {...empty("summary")}>
          {prompt.summary}
        </p>
      </section>

      <section id="meant-for" className={styles.meantForSection} aria-labelledby="meant-for-title">
        <h2 id="meant-for-title" className={styles.sectionTitle}>
          {t("meantFor")}
        </h2>
        <ul className={styles.tags} {...empty("meantFor")}>
          {prompt.meantFor.map((projectType, index) => (
            <li key={index}>{projectType}</li>
          ))}
        </ul>
      </section>

      <section id="highlights" className={styles.highlightsSection} aria-labelledby="highlights-title">
        <h2 id="highlights-title" className={styles.sectionTitle}>
          {t("highlights")}
        </h2>
        <ul className={styles.highlights} {...empty("highlights")}>
          {prompt.highlights.map((highlight, index) => (
            <li key={index}>{highlight}</li>
          ))}
        </ul>
      </section>

      <aside className={styles.purchase} aria-labelledby="purchase-title">
        <h2 id="purchase-title" className={utility_styles.visuallyHidden}>
          {t("purchase.title")}
        </h2>
        <p className={styles.price}>{formatPrice(prompt.priceUsd, locale, tPrice("free"))}</p>
        <dl className={styles.facts}>
          <div>
            <dt>{t("purchase.author")}</dt>
            <dd>{prompt.author}</dd>
          </div>
          <div>
            <dt>{t("purchase.length")}</dt>
            {/* Measured from the file, so blank until the author picks one. */}
            <dd>{has_file && lines}</dd>
          </div>
          <div>
            <dt>{t("purchase.context")}</dt>
            <dd>{has_file && t("purchase.contextValue", { count: prompt.context_tokens })}</dd>
          </div>
          <div>
            <dt>{t("purchase.category")}</dt>
            <dd>{category_label}</dd>
          </div>
        </dl>
        <p className={styles.note}>{t("purchase.contextNote")}</p>
        {free ? (
          <>
            <PrimaryButton
              href={downloadHref(prompt)}
              download
              is_inert={is_preview}
              aria-label={tPrompts("downloadFile", { fileName: file_name_in_text })}
            >
              {tPrompts("downloadFile", { fileName: file_name_in_text })}
            </PrimaryButton>
            <p className={styles.note}>{t("purchase.freeNote")}</p>
            {/* The CLI installs skills and agents; a prompt is copied or downloaded. */}
            {prompt.kind !== "prompt" && (
              <p className={styles.note}>
                <InlineCode text={t("purchase.cliNote", { command: `npx mdstore add ${prompt.slug}` })} />
              </p>
            )}
          </>
        ) : (
          <p className={styles.note}>{t("purchase.paidNote")}</p>
        )}
      </aside>

      <div className={styles.examples}>
        <OutputExamples examples={prompt.outputExamples} fileName={file_name_in_text} />
      </div>

      <div className={styles.models}>
        <TestedModels models={prompt.tested_models} tools={prompt.worksWith} fileName={file_name_in_text} />
      </div>

      <section id="preview" className={styles.preview} aria-labelledby="preview-title">
        <header className={styles.previewHeader}>
          <h2 id="preview-title" className={styles.sectionTitle}>
            {t("preview.title")}
          </h2>
          <p className={styles.note}>
            {t("preview.note", { fileName: file_name_in_text })}
            {fullMarkdown && t("preview.fullFileNote")}
          </p>
        </header>
        <div className={styles.fileView}>
          <pre className={styles.excerpt} {...empty("file")}>
            <code>
              {prompt.excerpt}
              {remainingLines > 0 && (
                <>
                  {"\n\n"}
                  <span data-token="comment">{`<!-- ${t("preview.moreLines", { count: remainingLines })} -->`}</span>
                </>
              )}
            </code>
          </pre>
          {fullMarkdown && (
            // Native disclosure; while open it replaces the excerpt (see .fileView in the CSS).
            <details className={styles.fullFile}>
              {/* Tertiary kind: informational trigger with no purchase intent */}
              <summary className={styles.toggle}>
                <span data-label="show">{t("preview.showFull", { lines })}</span>
                <span data-label="hide">{t("preview.hideFull")}</span>
              </summary>
              {/* Focusable so keyboard users can scroll the long file */}
              <pre
                className={styles.excerpt}
                data-full="true"
                tabIndex={0}
                aria-label={t("preview.fullLabel", { fileName: prompt.fileName })}
              >
                <code>{fullMarkdown}</code>
              </pre>
            </details>
          )}
        </div>
      </section>

      <section id="usage" className={styles.usageSection} aria-labelledby="usage-title">
        <h2 id="usage-title" className={styles.sectionTitle}>
          {t("usage")}
        </h2>
        <ol className={styles.steps} {...empty("usageSteps")}>
          {prompt.usageSteps.map((step, index) => (
            <li key={index}>
              {/* One flex item, so the text and its inline code keep flowing together */}
              <span>
                <InlineCode text={step} />
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section id="ratings" className={styles.ratingsSection} aria-labelledby="ratings-title">
        <h2 id="ratings-title" className={styles.sectionTitle}>
          {t("ratings.title")}
        </h2>
        {ratings}
      </section>
    </article>
  );
}
