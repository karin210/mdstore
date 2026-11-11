# Modals

How to build modal dialogs: which kind to use, how each one closes, and how to style them so every modal in the project looks and behaves the same. Follow it whenever you create or change a modal, a dialog, a confirmation or an overlay panel.

- **The codebase wins.** If the project already has a modal component or a dialog convention, extend it, don't mix two, and mention the difference.
- **Reuse, don't redefine.** Modal typography, inputs, close button and action row live in one shared place (the global stylesheet or one modal component), never per modal.
- **Readability first.** A modal usually carries important information, so its text stays plain and easy to read.

## 1. Two kinds, chosen by one question

Ask: is closing this modal a meaningful decision? Every modal is exactly one of these two.

### Non-dismissible

For modals that ask for a considered decision, usually opened by the user: creating, editing or deleting a record, adding a team member, disabling a schedule.

- It closes **only** through an explicit button named after its action ("Cancel", "Save", "Delete", "Accept"). Never by clicking outside, never with Escape, and never with a close (X) button.
- It always offers a **Cancel** button, even when it has no natural "back" step.
- With a native `<dialog>`, set `closedby="none"`. With a custom overlay, don't wire up outside-click or Escape handlers.

### Dismissible

For modals with no important decision, usually opened by the system: a notification-permission prompt, a date picker, an image viewer.

- It closes with an outside click, with Escape **and** with a floating X button. All three, always.
- The X button sits just outside the container's top-right corner (a negative offset), not clipped inside it. The container must be a positioned ancestor.

## 2. Shared styling

Define these once and reuse them. The names are a suggestion; keep the project's if it has its own.

- `.modal-title`: every modal heading. Use a plain, readable font rather than the decorative one used for page headings.
- `.modal-input`: every text input and `<select>` inside a modal, matching the site's forms so modal controls read like the rest of the UI.
- `.modal-close-floating`: the X button of a dismissible modal.
- `.modal-actions`: the button row of a non-dismissible modal. Buttons right-aligned at their content width (`justify-content: flex-end`), never full width or centred. If the modal's content is a centred column, group that content in its own wrapper and let the parent stretch the action row to the full width, so the alignment is set by the parent and the row needs no `align-self`.
- `.modal-btn` as the base, plus `.modal-btn-primary` (filled: Save, Accept, Continue) or `.modal-btn-cancel` (outlined): every button inside `.modal-actions`.

## 3. Behaviour and accessibility

- **Prefer the native `<dialog>` element** opened with `showModal()`. It gives you the backdrop, focus containment and Escape handling for free (disable the last one for non-dismissible modals).
- **Label it.** Point `aria-labelledby` at the modal title.
- **Move focus in and give it back.** Focus goes to the first control or the title when the modal opens, and returns to the element that opened it when it closes.
- **Keep keyboard use complete.** Tab order stays inside the modal while it is open, and every button shows a visible focus outline.
- **Lock the page behind it** from scrolling while the modal is open, and restore it on close.
- **Name the submit by its goal**, and show the busy state on it while the request is in flight (disabled, label such as "Saving…", same width).
- **Respect reduced motion.** Fade or scale the modal in, but calm the animation under `prefers-reduced-motion`.

## 4. Checklist

- Does closing it matter? Choose the kind, not the look.
- Non-dismissible: Cancel exists, there is no X, outside click and Escape do nothing.
- Dismissible: outside click, Escape and the floating X all close it.
- It reuses the shared title, input, close and action classes, and defines no modal styles of its own.
- Focus enters, stays inside, and returns to the trigger.
