# Button kinds

How to decide what a button looks like by the job it does. Follow it whenever you create or restyle a button, or add an action to a page.

- **The codebase wins.** If the project already has button components, use them, don't mix two sets, and mention the difference.
- **Pick the kind first; the look follows.** A button's kind comes from the job it does, not from where it sits.
- **One component per kind.** Each kind lives in its own component, so changing a kind changes it everywhere.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.

## 1. The four kinds

Button kinds express action hierarchy: what each action is for. The colour of a button comes from the palette and fits its visual weight. It doesn't define the palette. A destructive action, for example, uses the red status colour whatever its kind.

- **Primary:** the main calls to action tied directly to buying or to acquiring a customer, such as the hero CTA, the buy or book button, and sign in / sign up. Its shape and size may vary with where it is used.
- **Secondary:** follow-up to a purchase, the main operational actions of a dashboard, and contact buttons.
- **Tertiary:** informational triggers, contextual actions with no purchase intent, and settings-related buttons.
- **Interface:** controls for the UI itself rather than for a task, such as the menu toggle and the go-to-top button.

## 2. The primary button must stand out

It has to stand out from whatever is behind it, whether a colour or an image:

- **3:1 contrast** between its fill and its immediate surroundings (WCAG 2.1 non-text contrast).
- **4.5:1 contrast** between its label and its fill.

If it fails on a given surface, fix it in this order:

1. **Control the surface first.** Put the button over a known surface, such as the scrim or gradient overlay that content over images needs anyway, so the contrast no longer depends on what the image shows.
2. **If the primary still collides, create a brand-aligned variant** named `--color-primary-contrast`. Only create it when needed. It is a derived step of the same hue (lighter, darker, or an inverted fill and label pair), never an unrelated colour, so the brand stays recognizable. Define it with the other colour tokens and use it only on the surfaces where the primary fails.

## 3. Shared behaviour for every kind

- **Native elements:** a `<button>` for actions and an `<a>` for navigation, never a `<div>` that imitates either.
- **Visible focus** with the global focus outline.
- **No tap-highlight flash** on touch devices, with the focus outline left intact.
- **In-flight state:** while a request is running, the button shows its busy state (a spinner or a label such as "Saving…"), is disabled, and keeps its width so the label change doesn't move the layout.
- **A form's submit button stays enabled** even when the form is invalid. It is disabled only while the request is in flight.
- **Labels name the action** ("Save changes", "Delete booking"), not "OK" or "Submit".

## 4. Choosing the kind

Ask what the action is for:

- Does it move the user toward buying or signing up? **Primary.**
- Does it follow up on a purchase, run a main task in the dashboard, or contact the business? **Secondary.**
- Does it open information, adjust a setting, or do something with no purchase intent? **Tertiary.**
- Does it control the interface itself? **Interface.**

When two buttons sit side by side, the one with the greater purpose gets the heavier look. The eye goes to the brightest, highest-contrast element in its area, so don't give two buttons in one area the same weight.

## 5. Checklist

- The button uses the component of its kind, with no one-off styles.
- Only one primary action competes for attention in the same area.
- The primary button meets 3:1 against its surroundings and 4.5:1 for its label.
- It has a visible focus outline, a busy state and a stable width.
- Colours come from tokens, with no raw values.
