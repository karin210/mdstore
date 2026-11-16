import { useTranslations } from "next-intl";
import { Fragment, type CSSProperties, type ReactElement } from "react";
import { PrimaryButton } from "@/components/global/PrimaryButton/PrimaryButton";
import { SecondaryButton } from "@/components/global/SecondaryButton/SecondaryButton";
import { MarkdownField } from "@/components/homepage/MarkdownField/MarkdownField";
import { hero_file_lines, type HeroFileSegment } from "@/data/heroEditorLines";
import styles from "./Hero.module.css";

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
            {t("titleStart")}
            {t("titleEnd") && ` ${t("titleEnd")}`}
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
                {hero_file_lines.map((line, index) => (
                  <span
                    key={index}
                    className={styles.line}
                    data-token={line.token}
                    style={{ "--line-index": index } as CSSProperties}
                  >
                    {line.segments.map((segment: HeroFileSegment, segment_index: number) =>
                      typeof segment === "string" ? (
                        <Fragment key={segment_index}>{segment}</Fragment>
                      ) : (
                        <span key={segment_index} data-token="inline">
                          {segment.inline}
                        </span>
                      ),
                    )}
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
