"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactElement } from "react";
import form_styles from "@/styles/form.module.css";
import utility_styles from "@/styles/utilities.module.css";
import styles from "./PostListField.module.css";

interface PostListFieldProps {
  /** Base id: item n's input is `${id}-${n}` (the first one gets focus when the field needs a change). */
  id: string;
  label: string;
  hint: string;
  /** What is wrong with the list, once it was edited; empty when there is nothing to say. */
  guidance_text: string;
  /** The items as typed, empty ones included; always at least one. */
  items: string[];
  max_items: number;
  item_max_length: number;
  /** Accessible names, by item number (1-based). */
  get_item_label: (number: number) => string;
  get_remove_label: (number: number) => string;
  add_label: string;
  /** The state attributes of the field (aria-invalid, data-mark, data-valid), set on every input. */
  control_state: Record<string, string | boolean | undefined>;
  on_change: (items: string[]) => void;
  on_leave: () => void;
}

/**
 * A list the author builds one item at a time, as the listing shows it: one input per item, a button to
 * add one and one to remove each. Enter in an item adds a new one below it instead of submitting the form.
 * Focus follows the change: to the new item, or to the item before a removed one.
 */
export function PostListField({
  id,
  label,
  hint,
  guidance_text,
  items,
  max_items,
  item_max_length,
  get_item_label,
  get_remove_label,
  add_label,
  control_state,
  on_change,
  on_leave,
}: PostListFieldProps): ReactElement {
  // The item to focus after the next render (set by add and remove).
  const focus_index_ref = useRef<number | null>(null);
  const can_add = items.length < max_items;
  const described_by = `${id}-hint ${id}-guidance`;

  useEffect(() => {
    if (focus_index_ref.current === null) return;
    document.getElementById(`${id}-${focus_index_ref.current}`)?.focus();
    focus_index_ref.current = null;
  });

  function change_item(index: number, value: string): void {
    on_change(items.map((item, item_index) => (item_index === index ? value : item)));
  }

  function add_item_after(index: number): void {
    if (!can_add) return;
    focus_index_ref.current = index + 1;
    on_change([...items.slice(0, index + 1), "", ...items.slice(index + 1)]);
  }

  function remove_item(index: number): void {
    focus_index_ref.current = Math.max(0, index - 1);
    on_change(items.filter((_, item_index) => item_index !== index));
  }

  function handle_item_key_down(event: KeyboardEvent<HTMLInputElement>, index: number): void {
    if (event.key !== "Enter") return;
    event.preventDefault();
    add_item_after(index);
  }

  return (
    <fieldset className={styles.field} aria-describedby={described_by}>
      <legend className={form_styles.label}>{label}</legend>
      <ol className={styles.items}>
        {items.map((item, index) => (
          // Controlled inputs, so index keys keep each value in its place.
          <li key={index} className={styles.item}>
            <input
              id={`${id}-${index}`}
              type="text"
              autoComplete="off"
              className={form_styles.input}
              value={item}
              maxLength={item_max_length}
              aria-label={get_item_label(index + 1)}
              aria-describedby={described_by}
              {...control_state}
              onChange={(event) => change_item(index, event.target.value)}
              onKeyDown={(event) => handle_item_key_down(event, index)}
              onBlur={on_leave}
            />
            {/* The last item can't go: the list always keeps one input to type in. */}
            {items.length > 1 && (
              <button
                type="button"
                className={styles.remove}
                title={get_remove_label(index + 1)}
                onClick={() => remove_item(index)}
              >
                <span aria-hidden="true">×</span>
                <span className={utility_styles.visuallyHidden}>{get_remove_label(index + 1)}</span>
              </button>
            )}
          </li>
        ))}
      </ol>
      {can_add && (
        // Tertiary kind: a contextual action inside the form.
        <button type="button" className={styles.add} onClick={() => add_item_after(items.length - 1)}>
          <span aria-hidden="true">+</span> {add_label}
        </button>
      )}
      <p id={`${id}-hint`} className={form_styles.hint}>
        {hint}
      </p>
      <p id={`${id}-guidance`} className={form_styles.guidance} aria-live="polite" hidden={guidance_text === ""}>
        {guidance_text}
      </p>
    </fieldset>
  );
}
