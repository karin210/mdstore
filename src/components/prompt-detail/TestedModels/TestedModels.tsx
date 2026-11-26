import { useLocale, useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { ai_models, model_families, model_family_names, type TestedModel } from "@/data/aiModels";
import type { Locale } from "@/i18n/routing";
import { format_token_price } from "@/lib/formatPrice";
import styles from "./TestedModels.module.css";

interface TestedModelsProps {
  models: TestedModel[];
  /** The AI coding tools the prompt was tested with (`worksWith`), recorded by the staff, not the author. */
  tools: string[];
  fileName: string;
}

/** The models of one family, the recommended ones first (the sort is stable, so the listed order holds otherwise). */
function get_family_models(models: TestedModel[], family: (typeof model_families)[number]): TestedModel[] {
  return models
    .filter((tested) => ai_models[tested.model_id].family === family)
    .toSorted((first, second) => Number(second.recommended) - Number(first.recommended));
}

/** "Recommended" tag; the text, not only the colour, tells the models apart. */
function RecommendedTag({ label }: { label: string }): ReactElement {
  return (
    <span className={styles.tag}>
      <span aria-hidden="true">★</span> {label}
    </span>
  );
}

/**
 * What a prompt was tested with: the AI coding tools, then the specific models by family (the
 * recommended ones highlighted) and a cost table. The staff record it, not the authors; a post
 * the staff haven't tested yet shows a note instead.
 */
export function TestedModels({ models, tools, fileName }: TestedModelsProps): ReactElement {
  const t = useTranslations("promptDetail.models");
  const locale = useLocale() as Locale;
  const families = model_families
    .map((family) => ({ family, models: get_family_models(models, family) }))
    .filter((group) => group.models.length > 0);

  function get_note(): string {
    if (families.length > 0) return t("note", { fileName });
    return tools.length > 0 ? t("toolsOnly", { fileName }) : t("empty");
  }

  return (
    <section id="tested-models" className={styles.section} aria-labelledby="models-title">
      <header className={styles.header}>
        <h2 id="models-title" className={styles.title}>
          {t("title")}
        </h2>
        <p className={styles.note}>{get_note()}</p>
      </header>

      {tools.length > 0 && (
        <section className={styles.family} aria-labelledby="models-tools">
          <h3 id="models-tools" className={styles.familyName}>
            {t("tools")}
          </h3>
          <ul className={styles.tools}>
            {tools.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
        </section>
      )}

      {families.length > 0 && (
        <>
          <div className={styles.families}>
            {families.map((group) => (
              <section key={group.family} className={styles.family} aria-labelledby={`models-family-${group.family}`}>
                <h3 id={`models-family-${group.family}`} className={styles.familyName}>
                  {model_family_names[group.family]}
                </h3>
                <ul className={styles.models}>
                  {group.models.map((tested) => (
                    <li key={tested.model_id} data-recommended={tested.recommended}>
                      <span className={styles.modelName}>{ai_models[tested.model_id].name}</span>
                      {tested.recommended && <RecommendedTag label={t("recommended")} />}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* Focusable so keyboard users can scroll the table on narrow screens */}
          <div className={styles.tableScroll} role="region" aria-labelledby="models-cost-caption" tabIndex={0}>
            <table className={styles.table}>
              <caption id="models-cost-caption" className={styles.caption}>
                {t("table.caption")}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t("table.model")}</th>
                  <th scope="col">{t("table.input")}</th>
                  <th scope="col">{t("table.output")}</th>
                </tr>
              </thead>
              <tbody>
                {families.flatMap((group) =>
                  group.models.map((tested) => {
                    const model = ai_models[tested.model_id];

                    return (
                      <tr key={tested.model_id} data-recommended={tested.recommended}>
                        <th scope="row">
                          {/* A wrapper, because a <th> must stay a table cell to keep the column layout */}
                          <div className={styles.rowHeader}>
                            <span className={styles.modelName}>{model.name}</span>
                            {tested.recommended && <RecommendedTag label={t("recommended")} />}
                          </div>
                        </th>
                        <td>{format_token_price(model.input_per_mtok_usd, locale)}</td>
                        <td>{format_token_price(model.output_per_mtok_usd, locale)}</td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
