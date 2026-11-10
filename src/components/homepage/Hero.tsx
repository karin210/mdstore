import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { PrimaryButton } from "@/components/global/PrimaryButton";
import { SecondaryButton } from "@/components/global/SecondaryButton";
import styles from "./Hero.module.css";

const highlightKeys = ["noLockIn", "freePreview", "anyTool"] as const;

export function Hero(): ReactElement {
  const t = useTranslations("home.hero");

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.copy}>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 id="hero-title" className={styles.title}>
          {t("titleStart")} <span className={styles.highlight}>.md</span> {t("titleEnd")}
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

      <figure className={styles.file}>
        <figcaption className={styles.fileBar}>
          <span className={styles.dots} aria-hidden="true" />
          <span>CLAUDE.md</span>
        </figcaption>
        <pre className={styles.code}>
          <code>
            <span data-token="heading"># Senior Next.js pair programmer</span>
            {"\n\n"}
            <span data-token="heading">## Before writing code</span>
            {"\n"}- Read the installed framework docs first.
            {"\n"}- Ask when a requirement is ambiguous.
            {"\n\n"}
            <span data-token="heading">## Conventions</span>
            {"\n"}- Explicit return types, <span data-token="inline">no any</span>.
            {"\n"}- Semantic HTML, WCAG 2.1 AA.
            {"\n"}- Colours only through <span data-token="inline">:root</span> tokens.
            {"\n\n"}
            <span data-token="comment">{"<!-- 128 more lines -->"}</span>
          </code>
        </pre>
      </figure>
    </section>
  );
}
