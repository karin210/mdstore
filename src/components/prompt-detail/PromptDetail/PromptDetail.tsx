import { getLocale, getTranslations } from "next-intl/server";
import { Suspense, type ReactElement } from "react";
import { PrimaryButton } from "@/components/shared/PrimaryButton/PrimaryButton";
import { AuthorBar } from "@/components/prompt-detail/AuthorBar/AuthorBar";
import { InlineCode } from "@/components/prompt-detail/InlineCode/InlineCode";
import { OutputExamples } from "@/components/prompt-detail/OutputExamples/OutputExamples";
import { PromptRatings } from "@/components/prompt-detail/PromptRatings/PromptRatings";
import { RatingSummary } from "@/components/prompt-detail/RatingSummary/RatingSummary";
import { TestedModels } from "@/components/prompt-detail/TestedModels/TestedModels";
import { downloadHref, isFree } from "@/data/prompts";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatPrice } from "@/lib/formatPrice";
import { getPromptOrNotFound } from "@/lib/getPromptOrNotFound";
import styles from "@/components/prompt-detail/shared/PromptDetail.module.css";
import utility_styles from "@/styles/utilities.module.css";

interface PromptDetailProps {
  /** The route's params promise, awaited here so the read happens inside the page's <Suspense>. */
  params: Promise<{ slug: string }>;
}

/** Everything on /prompts/[slug] that depends on the listing in the URL. */
export async function PromptDetail({ params }: PromptDetailProps): Promise<ReactElement> {
  const prompt = await getPromptOrNotFound(params);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("promptDetail");
  const tPrompts = await getTranslations("prompts");
  const tPrice = await getTranslations("price");
  const free = isFree(prompt);
  const remainingLines = prompt.lineCount - prompt.excerpt.split("\n").length;
  // Null for paid prompts: their content never reaches the page's HTML.
  const fullMarkdown = free ? prompt.fullMarkdown : null;
  const category = tPrompts(`categories.${prompt.category}`);
  const lines = tPrompts("lineCount", { count: prompt.lineCount });

  return (
    <>
      <nav className={styles.breadcrumb} aria-label={t("breadcrumb.label")}>
        <ol>
          <li>
            <Link href={{ pathname: "/", hash: "featured" }}>{t("breadcrumb.prompts")}</Link>
          </li>
          <li>
            <span aria-current="page">{prompt.fileName}</span>
          </li>
        </ol>
      </nav>

      {prompt.reviewStatus ? (
        <p className={styles.reviewNotice} data-status={prompt.reviewStatus} role="status">
          {t(`reviewNotice.${prompt.reviewStatus}`)}
          <Link className={styles.reviewLink} href={`/prompts/${prompt.slug}/review`}>
            {t("reviewNotice.openReview")}
          </Link>
        </p>
      ) : (
        prompt.isPosted && (
          // Only this bar reads the session; the listing itself stays cached and shared.
          <Suspense fallback={null}>
            <AuthorBar slug={prompt.slug} />
          </Suspense>
        )
      )}

      <article className={styles.layout} aria-labelledby="prompt-title">
        <header id="overview" className={styles.header}>
          <p className={styles.top}>
            <code className={styles.fileName}>{prompt.fileName}</code>
            <span className={styles.category}>{category}</span>
          </p>
          <h1 id="prompt-title" className={styles.title}>
            {prompt.title}
          </h1>
          <h2 className={styles.tagline}>{prompt.tagline}</h2>
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
          <p className={styles.summary}>{prompt.summary}</p>
        </section>

        <section id="meant-for" className={styles.meantForSection} aria-labelledby="meant-for-title">
          <h2 id="meant-for-title" className={styles.sectionTitle}>
            {t("meantFor")}
          </h2>
          <ul className={styles.tags}>
            {prompt.meantFor.map((projectType) => (
              <li key={projectType}>{projectType}</li>
            ))}
          </ul>
        </section>

        <section id="highlights" className={styles.highlightsSection} aria-labelledby="highlights-title">
          <h2 id="highlights-title" className={styles.sectionTitle}>
            {t("highlights")}
          </h2>
          <ul className={styles.highlights}>
            {prompt.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
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
              <dd>{lines}</dd>
            </div>
            <div>
              <dt>{t("purchase.context")}</dt>
              <dd>{t("purchase.contextValue", { count: prompt.context_tokens })}</dd>
            </div>
            <div>
              <dt>{t("purchase.category")}</dt>
              <dd>{category}</dd>
            </div>
          </dl>
          <p className={styles.note}>{t("purchase.contextNote")}</p>
          {free ? (
            <>
              <PrimaryButton
                href={downloadHref(prompt)}
                download
                aria-label={tPrompts("downloadFile", { fileName: prompt.fileName })}
              >
                {tPrompts("downloadFile", { fileName: prompt.fileName })}
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
          <OutputExamples examples={prompt.outputExamples} fileName={prompt.fileName} />
        </div>

        <div className={styles.models}>
          <TestedModels models={prompt.tested_models} tools={prompt.worksWith} fileName={prompt.fileName} />
        </div>

        <section id="preview" className={styles.preview} aria-labelledby="preview-title">
          <header className={styles.previewHeader}>
            <h2 id="preview-title" className={styles.sectionTitle}>
              {t("preview.title")}
            </h2>
            <p className={styles.note}>
              {t("preview.note", { fileName: prompt.fileName })}
              {fullMarkdown && t("preview.fullFileNote")}
            </p>
          </header>
          <div className={styles.fileView}>
            <pre className={styles.excerpt}>
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
          <ol className={styles.steps}>
            {prompt.usageSteps.map((step) => (
              <li key={step}>
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
          {prompt.rating ? (
            <>
              <RatingSummary rating={prompt.rating} size="large" />
              {/* Only this part reads the session; the listing itself stays cached and shared. */}
              <Suspense fallback={null}>
                <PromptRatings slug={prompt.slug} />
              </Suspense>
            </>
          ) : (
            <p className={styles.note}>{t("ratings.catalogue")}</p>
          )}
        </section>
      </article>
    </>
  );
}
