"use client";

import { useTranslations } from "next-intl";
import { useId, useState, useTransition, type FormEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/shared/FormAlert/FormAlert";
import { StarIcon } from "@/components/shared/icons/icons";
import { SubmitButton } from "@/components/shared/SubmitButton/SubmitButton";
import { STAR_VALUES } from "@/lib/rating";
import { rate_prompt, type RatePromptResult } from "@/server/ratings/actions";
import review_styles from "@/styles/review.module.css";
import utility_styles from "@/styles/utilities.module.css";
import styles from "./RatingForm.module.css";

interface RatingFormProps {
  slug: string;
  /** The reader's saved stars, or null while they haven't rated. */
  saved_stars: number | null;
}

type Notice = { tone: "success"; key: "saved" | "removed" } | { tone: "error"; result: RatePromptResult };

/**
 * A reader's rating: five native radio buttons drawn as stars (arrow keys move between them),
 * saved with the submit button; a text button removes a saved rating. The server re-checks
 * everything; on success the page's totals refresh through the post's cache tag.
 */
export function RatingForm({ slug, saved_stars }: RatingFormProps): ReactElement {
  const t = useTranslations("promptDetail.ratings");
  const name = useId();
  const [stars, set_stars] = useState<number | null>(saved_stars);
  const [hovered, set_hovered] = useState<number | null>(null);
  const [saved, set_saved] = useState<number | null>(saved_stars);
  const [notice, set_notice] = useState<Notice | null>(null);
  const [pick_needed, set_pick_needed] = useState(false);
  const [is_pending, start_transition] = useTransition();
  const [pending_action, set_pending_action] = useState<"save" | "remove" | null>(null);

  function send(next: number | null): void {
    set_pending_action(next === null ? "remove" : "save");
    start_transition(async () => {
      const result = await rate_prompt(slug, next);
      if (result.status === "saved") {
        set_saved(result.stars);
        set_stars(result.stars);
        set_notice({ tone: "success", key: result.stars === null ? "removed" : "saved" });
      } else {
        set_notice({ tone: "error", result });
      }
      set_pending_action(null);
    });
  }

  function handle_submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (stars === null) {
      set_pick_needed(true);
      event.currentTarget.querySelector("input")?.focus();
      return;
    }
    send(stars);
  }

  const shown = hovered ?? stars ?? 0;
  const error_message =
    notice?.tone === "error" && notice.result.status === "error"
      ? notice.result.request_id
        ? t("errors.serverWithId", { id: notice.result.request_id })
        : t(`errors.${notice.result.error_key}`)
      : null;

  return (
    <form className={styles.form} onSubmit={handle_submit} noValidate>
      <fieldset className={styles.fieldset} aria-describedby={pick_needed ? `${name}-guidance` : undefined}>
        <legend className={styles.legend}>{saved === null ? t("yourRating") : t("yourSavedRating")}</legend>
        <div className={styles.stars} onPointerLeave={() => set_hovered(null)}>
          {STAR_VALUES.map((value) => (
            <label
              key={value}
              className={styles.star}
              data-filled={value <= shown}
              onPointerEnter={() => set_hovered(value)}
            >
              <input
                type="radio"
                name={name}
                value={value}
                checked={stars === value}
                onChange={() => {
                  set_stars(value);
                  set_pick_needed(false);
                }}
                className={utility_styles.visuallyHidden}
              />
              <StarIcon />
              <span className={utility_styles.visuallyHidden}>{t("starLabel", { count: value })}</span>
            </label>
          ))}
        </div>
        {pick_needed && (
          <p id={`${name}-guidance`} className={styles.guidance}>
            {t("pickStars")}
          </p>
        )}
      </fieldset>

      <div className={styles.actions}>
        <SubmitButton label={t("save")} busyLabel={t("saving")} isBusy={is_pending && pending_action === "save"} />
        {saved !== null && (
          <button type="button" className={review_styles.textButton} disabled={is_pending} onClick={() => send(null)}>
            {pending_action === "remove" ? t("removing") : t("remove")}
          </button>
        )}
      </div>

      {notice?.tone === "success" && <FormAlert tone="success">{t(notice.key)}</FormAlert>}
      {error_message && <FormAlert tone="error">{error_message}</FormAlert>}
    </form>
  );
}
