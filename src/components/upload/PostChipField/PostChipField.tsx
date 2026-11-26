"use client";

import type { ReactElement } from "react";
import form_styles from "@/styles/form.module.css";
import utility_styles from "@/styles/utilities.module.css";
import styles from "./PostChipField.module.css";

interface ChipOption {
  value: string;
  label: string;
}

interface PostChipFieldProps {
  /** Base id: option n's input is `${id}-${n}` (the first one gets focus when the field needs a change). */
  id: string;
  /** The form field name the inputs submit under. */
  name: string;
  label: string;
  options: ChipOption[];
  /** The chosen value; empty while nothing is chosen. */
  value: string;
  /** What is wrong with the choice, once the field was left; empty when there is nothing to say. */
  guidance_text: string;
  is_invalid: boolean;
  on_change: (value: string) => void;
  on_leave: () => void;
}

/**
 * One choice among a few, shown as chips: native radio inputs, so only one is chosen and the arrow keys
 * move between them, each drawn as a pill around its label (the chosen one filled with the primary colour).
 */
export function PostChipField({
  id,
  name,
  label,
  options,
  value,
  guidance_text,
  is_invalid,
  on_change,
  on_leave,
}: PostChipFieldProps): ReactElement {
  return (
    <fieldset
      className={styles.field}
      aria-describedby={`${id}-guidance`}
      aria-invalid={is_invalid}
      data-invalid={is_invalid}
    >
      <legend className={form_styles.label}>{label}</legend>
      <div className={styles.chips}>
        {options.map((option, index) => (
          <label key={option.value} className={styles.chip}>
            <input
              id={`${id}-${index}`}
              type="radio"
              name={name}
              value={option.value}
              className={utility_styles.visuallyHidden}
              checked={value === option.value}
              onChange={() => on_change(option.value)}
              onBlur={on_leave}
            />
            {option.label}
          </label>
        ))}
      </div>
      <p id={`${id}-guidance`} className={form_styles.guidance} aria-live="polite" hidden={guidance_text === ""}>
        {guidance_text}
      </p>
    </fieldset>
  );
}
