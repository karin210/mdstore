import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import styles from "./HowItWorks.module.css";

const tracks = [
  { id: "buyers", steps: ["find", "preview", "dropIn"] },
  { id: "sellers", steps: ["write", "publish", "earn"] },
] as const;

export function HowItWorks(): ReactElement {
  const t = useTranslations("home.howItWorks");

  return (
    <section id="how-it-works" className="page-section" aria-labelledby="how-title">
      <header className="section-heading">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 id="how-title">{t("title")}</h2>
      </header>
      <div className={styles.tracks}>
        {tracks.map((track) => (
          <article key={track.id} className={styles.track} aria-labelledby={`track-${track.id}`}>
            <h3 id={`track-${track.id}`} className={styles.audience}>
              {t(`${track.id}.audience`)}
            </h3>
            <ol className={styles.steps}>
              {track.steps.map((step) => (
                <li key={step} className={styles.step}>
                  {/* Each track has its own step keys, so the lookup is cast to the shared shape. */}
                  <strong>{t(`${track.id}.${step}.title` as never)}</strong>
                  <span>{t(`${track.id}.${step}.text` as never)}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}
