import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { PrimaryButton } from "@/components/global/PrimaryButton";
import styles from "./not-found.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notFound.meta");
  return { title: t("title") };
}

/** Branded 404 for every unmatched URL (served with a real 404 status). */
export default async function NotFound(): Promise<ReactElement> {
  const t = await getTranslations("notFound");

  return (
    <main className={styles.main}>
      <section className={styles.card} aria-labelledby="not-found-title">
        <code className={styles.code}>404.md</code>
        <h1 id="not-found-title" className={styles.title}>
          {t("title")}
        </h1>
        <p className={styles.text}>{t("text")}</p>
        <PrimaryButton href="/">{t("back")}</PrimaryButton>
      </section>
    </main>
  );
}
