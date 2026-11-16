import { useLocale, useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { PrimaryButton } from "@/components/shared/PrimaryButton/PrimaryButton";
import { downloadHref, isFree, promptHref, type PromptListing } from "@/data/prompts";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/formatPrice";
import utility_styles from "@/styles/utilities.module.css";
import styles from "./PromptCard.module.css";

interface PromptCardProps {
  prompt: PromptListing;
}

export function PromptCard({ prompt }: PromptCardProps): ReactElement {
  const t = useTranslations("prompts");
  const tCommon = useTranslations("price");
  const locale = useLocale();
  const titleId = `prompt-${prompt.slug}-title`;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <header className={styles.top}>
        <code className={styles.fileName}>{prompt.fileName}</code>
        <span className={styles.category}>{t(`categories.${prompt.category}`)}</span>
      </header>
      <h3 id={titleId} className={styles.title}>
        <Link href={promptHref(prompt)} className={styles.titleLink}>
          {t(`listings.${prompt.slug}.title`)}
        </Link>
      </h3>
      <p className={styles.summary}>{t(`listings.${prompt.slug}.summary`)}</p>
      <ul className={styles.tools} aria-label={t("card.testedWith")}>
        {prompt.worksWith.map((tool) => (
          <li key={tool}>{tool}</li>
        ))}
      </ul>
      <footer className={styles.bottom}>
        <dl className={styles.meta}>
          <div>
            <dt className={utility_styles.visuallyHidden}>{t("card.price")}</dt>
            <dd className={styles.price}>{formatPrice(prompt.priceUsd, locale, tCommon("free"))}</dd>
          </div>
          <div>
            <dt className={utility_styles.visuallyHidden}>{t("card.authorAndLength")}</dt>
            <dd className={styles.byline}>
              {prompt.author} · {t("lineCount", { count: prompt.lineCount })}
            </dd>
          </div>
        </dl>
        {isFree(prompt) && (
          <div className={styles.actions}>
            <PrimaryButton
              href={downloadHref(prompt)}
              download
              size="small"
              aria-label={t("downloadFile", { fileName: prompt.fileName })}
            >
              {t("card.download")}
            </PrimaryButton>
          </div>
        )}
      </footer>
    </article>
  );
}
