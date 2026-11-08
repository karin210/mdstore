import { getLocale, getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { PrimaryButton } from "@/components/global/PrimaryButton";
import { InlineCode } from "@/components/prompt-detail/InlineCode";
import { OutputExamples } from "@/components/prompt-detail/OutputExamples";
import { downloadHref, isFree } from "@/data/prompts";
import { Link } from "@/i18n/navigation";
import { messageList } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import { formatPrice } from "@/lib/formatPrice";
import { getPromptOrNotFound } from "@/lib/getPromptOrNotFound";
import { readPromptMarkdown } from "@/lib/promptFiles";
import styles from "./PromptDetail.module.css";

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
  // Only free files are read: a paid file's content must never reach the page's HTML.
  const fullMarkdown = free ? await readPromptMarkdown(prompt.fileName) : null;
  const category = tPrompts(`categories.${prompt.category}`);
  const lines = tPrompts("lineCount", { count: prompt.lineCount });
  const listing = `listings.${prompt.slug}` as const;

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

      <article className={styles.layout} aria-labelledby="prompt-title">
        <header className={styles.header}>
          <p className={styles.top}>
            <code className={styles.fileName}>{prompt.fileName}</code>
            <span className={styles.category}>{category}</span>
          </p>
          <h1 id="prompt-title" className={styles.title}>
            {tPrompts(`${listing}.title`)}
          </h1>
          <h2 className={styles.tagline}>{tPrompts(`${listing}.tagline`)}</h2>
        </header>

        <section className={styles.summarySection} aria-labelledby="summary-title">
          <h2 id="summary-title" className={styles.sectionTitle}>
            {t("summary")}
          </h2>
          <p className={styles.summary}>{tPrompts(`${listing}.summary`)}</p>
        </section>

        <section className={styles.meantForSection} aria-labelledby="meant-for-title">
          <h2 id="meant-for-title" className={styles.sectionTitle}>
            {t("meantFor")}
          </h2>
          <ul className={styles.tags}>
            {messageList(tPrompts.raw(`${listing}.meantFor`)).map((projectType) => (
              <li key={projectType}>{projectType}</li>
            ))}
          </ul>
        </section>

        <section className={styles.highlightsSection} aria-labelledby="highlights-title">
          <h2 id="highlights-title" className={styles.sectionTitle}>
            {t("highlights")}
          </h2>
          <ul className={styles.highlights}>
            {messageList(tPrompts.raw(`${listing}.highlights`)).map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>

        <aside className={styles.purchase} aria-labelledby="purchase-title">
          <h2 id="purchase-title" className="visually-hidden">
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
              <dt>{t("purchase.category")}</dt>
              <dd>{category}</dd>
            </div>
            <div>
              <dt>{t("purchase.testedWith")}</dt>
              <dd>
                <ul className={styles.tools}>
                  {prompt.worksWith.map((tool) => (
                    <li key={tool}>{tool}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
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
            </>
          ) : (
            <p className={styles.note}>{t("purchase.paidNote")}</p>
          )}
        </aside>

        <div className={styles.examples}>
          <OutputExamples examples={prompt.outputExamples} fileName={prompt.fileName} />
        </div>

        <section className={styles.preview} aria-labelledby="preview-title">
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

        <section className={styles.usageSection} aria-labelledby="usage-title">
          <h2 id="usage-title" className={styles.sectionTitle}>
            {t("usage")}
          </h2>
          <ol className={styles.steps}>
            {messageList(tPrompts.raw(`${listing}.usageSteps`)).map((step) => (
              <li key={step}>
                {/* One flex item, so the text and its inline code keep flowing together */}
                <span>
                  <InlineCode text={step} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      </article>
    </>
  );
}
