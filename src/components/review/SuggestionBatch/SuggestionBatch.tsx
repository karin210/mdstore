"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent, type ReactElement } from "react";
import { SuggestionDiff } from "@/components/review/SuggestionCard/SuggestionCard";
import { FormAlert } from "@/components/shared/FormAlert/FormAlert";
import { SubmitButton } from "@/components/shared/SubmitButton/SubmitButton";
import { ranges_overlap } from "@/lib/review/suggestions";
import { apply_suggestions } from "@/server/reviews/actions";
import form_styles from "@/styles/form.module.css";
import review_styles from "@/styles/review.module.css";
import styles from "./SuggestionBatch.module.css";

/** A pending suggestion that applies to the latest revision, ready to show. */
export interface BatchSuggestion {
  id: string;
  username: string;
  revision_number: number;
  first_line: number;
  last_line: number;
  original: string[];
  proposed: string[];
  /** Where its lines are in the latest revision. */
  target: { start: number; end: number };
}

const NOTE_MAX_LENGTH = 5000;

/**
 * For the post's authors: every suggestion they can still accept, to apply several at once as one new
 * revision (like adding suggestions to a batch on a pull request). Single ones are also answered where they
 * appear in the conversation and the file.
 */
export function SuggestionBatch({
  review_id,
  suggestions,
}: {
  review_id: string;
  suggestions: BatchSuggestion[];
}): ReactElement {
  const t = useTranslations("review.suggestion.batch");
  const t_review = useTranslations("review");
  const router = useRouter();
  const id = useId();
  const [chosen, set_chosen] = useState<Set<string>>(() => new Set());
  const [note, set_note] = useState("");
  const [guidance, set_guidance] = useState("");
  const [error_message, set_error_message] = useState("");
  const [is_sending, start_sending] = useTransition();

  function toggle(suggestion_id: string, is_chosen: boolean): void {
    const next = new Set(chosen);
    if (is_chosen) next.add(suggestion_id);
    else next.delete(suggestion_id);
    set_chosen(next);
    set_guidance("");
  }

  function apply(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    set_error_message("");
    const picked = suggestions.filter((suggestion) => chosen.has(suggestion.id));
    const issue =
      picked.length === 0
        ? t("none")
        : ranges_overlap(picked.map((suggestion) => suggestion.target))
          ? t("overlap")
          : note.trim().length > NOTE_MAX_LENGTH
            ? t_review("comment.tooLong", { max: NOTE_MAX_LENGTH })
            : "";
    set_guidance(issue);
    if (issue) {
      document.getElementById(`${id}-legend`)?.focus();
      return;
    }
    start_sending(async () => {
      const result = await apply_suggestions(
        review_id,
        picked.map((suggestion) => ({ id: suggestion.id })),
        note,
      );
      if (result.status === "ok") {
        set_chosen(new Set());
        set_note("");
        router.refresh();
        return;
      }
      set_error_message(t_review(`errors.${result.error_key}`, { requestId: result.request_id ?? "" }));
    });
  }

  return (
    <form className={review_styles.card} noValidate onSubmit={apply} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={review_styles.cardTitle}>
        {t("title", { count: suggestions.length })}
      </h2>
      <fieldset className={styles.fieldset} aria-describedby={`${id}-guidance`}>
        <legend id={`${id}-legend`} className={review_styles.muted} tabIndex={-1}>
          {t("lead")}
        </legend>
        <ul className={styles.list}>
          {suggestions.map((suggestion) => (
            <li key={suggestion.id} className={styles.item}>
              <label className={styles.choice}>
                <input
                  type="checkbox"
                  checked={chosen.has(suggestion.id)}
                  onChange={(event) => toggle(suggestion.id, event.target.checked)}
                />
                {t("item", {
                  count: suggestion.last_line - suggestion.first_line + 1,
                  first: suggestion.first_line,
                  last: suggestion.last_line,
                  number: suggestion.revision_number,
                  username: suggestion.username,
                })}
              </label>
              <SuggestionDiff
                original={suggestion.original}
                proposed={suggestion.proposed}
                label={t_review("suggestion.diffLabel")}
              />
            </li>
          ))}
        </ul>
        <p id={`${id}-guidance`} className={form_styles.guidance} aria-live="polite" hidden={guidance === ""}>
          {guidance}
        </p>
      </fieldset>
      <div className={form_styles.field}>
        <label htmlFor={`${id}-note`} className={form_styles.label}>
          {t("noteLabel")}
        </label>
        <textarea
          id={`${id}-note`}
          className={form_styles.input}
          rows={2}
          value={note}
          onChange={(event) => set_note(event.target.value)}
        />
      </div>
      {error_message && <FormAlert tone="error">{error_message}</FormAlert>}
      <div className={review_styles.formActions}>
        <SubmitButton label={t("submit", { count: chosen.size })} busyLabel={t("busy")} isBusy={is_sending} />
      </div>
    </form>
  );
}
