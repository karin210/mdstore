"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useTransition, type KeyboardEvent, type ReactElement } from "react";
import { normalize_username, USERNAME_MAX_LENGTH, USERNAME_SEARCH_PATTERN } from "@/lib/validation/username";
import { search_usernames } from "@/server/profiles/searchUsernames";
import form_styles from "@/styles/form.module.css";
import utility_styles from "@/styles/utilities.module.css";
import styles from "./CoauthorPicker.module.css";

interface CoauthorPickerProps {
  /** The search input's id (the field's focus target); the hint, status and lists derive their ids from it. */
  id: string;
  /** The chosen usernames, without @. */
  coauthors: string[];
  max_coauthors: number;
  /** What is wrong with the choice, once checked; empty when there is nothing to say. */
  guidance_text: string;
  on_change: (coauthors: string[]) => void;
}

/** Where the last search stands; `matches` keeps the results on screen until the next search. */
type SearchState =
  | { phase: "idle" }
  | { phase: "too_short" }
  | { phase: "searching"; query: string }
  | { phase: "done"; query: string; matches: string[] }
  | { phase: "error" };

/**
 * Co-authors for a new post: the author types part of a username and presses Search (or Enter), the matching
 * users appear in a list below, and "Add" moves one to the chosen co-authors, who can be removed again. Only
 * users the search found can be chosen, so every name is a real account; the server re-checks when it adds them.
 */
export function CoauthorPicker({
  id,
  coauthors,
  max_coauthors,
  guidance_text,
  on_change,
}: CoauthorPickerProps): ReactElement {
  const t = useTranslations("upload.form.fields.coauthors");
  const [query, set_query] = useState("");
  const [search, set_search] = useState<SearchState>({ phase: "idle" });
  // Said in the status line after an add or a remove, so screen readers hear what changed.
  const [last_change, set_last_change] = useState("");
  const [, start_search] = useTransition();
  const input_ref = useRef<HTMLInputElement>(null);
  const is_full = coauthors.length >= max_coauthors;
  const chosen = new Set(coauthors.map((username) => username.toLowerCase()));

  function run_search(): void {
    const query_normalized = normalize_username(query);
    set_last_change("");
    if (!USERNAME_SEARCH_PATTERN.test(query_normalized)) {
      set_search({ phase: "too_short" });
      return;
    }
    set_search({ phase: "searching", query: query_normalized });
    start_search(async () => {
      try {
        const result = await search_usernames(query_normalized);
        set_search(
          result.status === "ok"
            ? { phase: "done", query: query_normalized, matches: result.usernames }
            : { phase: "error" },
        );
      } catch {
        // The request itself failed (offline, server down).
        set_search({ phase: "error" });
      }
    });
  }

  function handle_key_down(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Enter") return;
    // Enter searches instead of submitting the whole form.
    event.preventDefault();
    run_search();
  }

  function add(username: string): void {
    if (is_full || chosen.has(username.toLowerCase())) return;
    on_change([...coauthors, username]);
    set_last_change(t("addedStatus", { username }));
    // The Add button turns into "Added" and can't keep focus; the search box is where the next step starts.
    input_ref.current?.focus();
  }

  function remove(username: string): void {
    on_change(coauthors.filter((coauthor) => coauthor !== username));
    set_last_change(t("removedStatus", { username }));
    input_ref.current?.focus();
  }

  function get_status_text(): string {
    if (last_change !== "") return last_change;
    switch (search.phase) {
      case "idle":
        return "";
      case "too_short":
        return t("tooShort");
      case "searching":
        return t("searching");
      case "error":
        return t("error");
      case "done":
        return search.matches.length === 0
          ? t("noMatch", { query: search.query })
          : t("found", { count: search.matches.length });
    }
  }

  const status_text = get_status_text();
  const matches = search.phase === "done" ? search.matches : [];

  return (
    <fieldset className={styles.field} aria-describedby={`${id}-hint ${id}-guidance`}>
      <legend className={form_styles.label}>{t("label")}</legend>
      <p id={`${id}-hint`} className={form_styles.hint}>
        {t("hint", { max: max_coauthors })}
      </p>

      <div className={styles.searchRow}>
        <input
          ref={input_ref}
          id={id}
          type="search"
          autoComplete="off"
          spellCheck={false}
          className={form_styles.input}
          value={query}
          maxLength={USERNAME_MAX_LENGTH + 1}
          placeholder={t("placeholder")}
          aria-label={t("searchLabel")}
          aria-describedby={`${id}-hint ${id}-status`}
          onChange={(event) => set_query(event.target.value)}
          onKeyDown={handle_key_down}
        />
        {/* Tertiary kind: a contextual action inside the form. */}
        <button
          type="button"
          className={styles.searchButton}
          aria-disabled={search.phase === "searching"}
          onClick={() => {
            if (search.phase !== "searching") run_search();
          }}
        >
          {search.phase === "searching" ? t("searching") : t("search")}
        </button>
      </div>

      <p id={`${id}-status`} className={styles.status} role="status" hidden={status_text === ""}>
        {status_text}
      </p>

      {matches.length > 0 && (
        <ul className={styles.results} aria-label={t("resultsLabel")}>
          {matches.map((username) => {
            const is_chosen = chosen.has(username.toLowerCase());
            return (
              <li key={username} className={styles.result}>
                <span className={styles.username}>@{username}</span>
                <button
                  type="button"
                  className={styles.addButton}
                  disabled={is_chosen || is_full}
                  aria-label={is_chosen ? t("addedLabel", { username }) : t("addLabel", { username })}
                  onClick={() => add(username)}
                >
                  {is_chosen ? t("added") : t("add")}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {is_full && matches.length > 0 && <p className={form_styles.hint}>{t("full", { max: max_coauthors })}</p>}

      {coauthors.length > 0 && (
        <div className={styles.chosen}>
          <p className={styles.chosenTitle}>{t("chosenTitle", { count: coauthors.length })}</p>
          <ul className={styles.chips}>
            {coauthors.map((username) => (
              <li key={username} className={styles.chip}>
                @{username}
                <button
                  type="button"
                  className={styles.removeButton}
                  title={t("removeLabel", { username })}
                  onClick={() => remove(username)}
                >
                  <span aria-hidden="true">×</span>
                  <span className={utility_styles.visuallyHidden}>{t("removeLabel", { username })}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p id={`${id}-guidance`} className={form_styles.guidance} aria-live="polite" hidden={guidance_text === ""}>
        {guidance_text}
      </p>
    </fieldset>
  );
}
