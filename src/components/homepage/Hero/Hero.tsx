import { useTranslations } from "next-intl";
import type { CSSProperties, ReactElement } from "react";
import { PrimaryButton } from "@/components/global/PrimaryButton/PrimaryButton";
import { SecondaryButton } from "@/components/global/SecondaryButton/SecondaryButton";
import { MarkdownField } from "@/components/homepage/MarkdownField/MarkdownField";
import styles from "./Hero.module.css";

const highlightKeys = ["noLockIn", "freePreview", "anyTool"] as const;

/** The first lines of a prompt file, shown in the hero editor window. */
const FILE_LINES: { token?: "heading" | "comment"; text: ReactElement | string }[] = [
  { token: "heading", text: "# Senior Next.js pair programmer" },
  { text: "" },
  { token: "heading", text: "## Before writing code" },
  { text: "- Read the installed framework docs first." },
  { text: "- Ask when a requirement is ambiguous." },
  { text: "" },
  { token: "heading", text: "## Conventions" },
  {
    text: (
      <>
        - Explicit return types, <span data-token="inline">no any</span>.
      </>
    ),
  },
  { text: "- Semantic HTML, WCAG 2.1 AA." },
  {
    text: (
      <>
        - Colours only through <span data-token="inline">:root</span> tokens.
      </>
    ),
  },
  { text: "" },
  { token: "comment", text: "<!-- 128 more lines -->" },
];

export function Hero(): ReactElement {
  const t = useTranslations("home.hero");

  return (
    <section id="intro" className={styles.hero} aria-labelledby="hero-title">
      {/* Decorative backdrop: the animated Markdown field under a scrim that keeps the copy legible. */}
      <div className={styles.backdrop} aria-hidden="true">
        <MarkdownField className={styles.field} />
        <div className={styles.scrim} />
      </div>

      <div className={styles.content}>
        <div className={styles.copy}>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 id="hero-title" className={styles.title}>
            {t("titleStart")} <span className={styles.highlight}>.md</span> {t("titleEnd")}
            <span className={styles.caret} aria-hidden="true" />
          </h1>
          <p className={styles.lead}>{t("lead")}</p>
          <div className={styles.actions}>
            <PrimaryButton href={{ pathname: "/", hash: "featured" }} size="large">
              {t("browse")}
            </PrimaryButton>
            <SecondaryButton href="/upload" size="large">
              {t("upload")}
            </SecondaryButton>
          </div>
          <ul className={styles.highlights}>
            {highlightKeys.map((key) => (
              <li key={key}>{t(`highlights.${key}`)}</li>
            ))}
          </ul>
        </div>

        <div className={styles.stage}>
          <figure className={styles.file}>
            <figcaption className={styles.fileBar}>
              <span className={styles.dots} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span>CLAUDE.md</span>
            </figcaption>
            <pre className={styles.code}>
              <code className={styles.lines}>
                {FILE_LINES.map((line, index) => (
                  <span
                    key={index}
                    className={styles.line}
                    data-token={line.token}
                    style={{ "--line-index": index } as CSSProperties}
                  >
                    {line.text}
                    {"\n"}
                  </span>
                ))}
              </code>
            </pre>
          </figure>
        </div>
      </div>
    </section>
  );
}
