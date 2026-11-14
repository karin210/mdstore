# Authentication forms

How to build sign-in, sign-up and password forms that are easy to get right: one page with tabs, validation as the user types, guidance under each field, and password rules that accept whatever the browser suggests. Follow it whenever you create or change a sign-in, sign-up, password reset or similar account form.

- **The codebase wins.** If the project already has form components or a validation module, extend them, don't mix two approaches, and mention the difference.
- **Write in the project's language.** Labels, guidance and error messages use the site's language. The strings below are examples.
- **The server decides.** Everything the form checks is checked again on the server with the same rules; client validation is only guidance.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.

## 1. One page, two tabs

Don't separate sign-in from sign-up with a "Do you already have an account?" link at the bottom of the form. It is easy to overlook, and people stay on the wrong form without realising there is another one. Put both modes in one card with a tab bar at the top.

- **The page owns the mode; each form owns its fields.** The page holds the active mode (`signIn` | `signUp`), the redirect after success and the submission state (`submitting`, `errorMessage`), and passes them down. `SignInForm` and `SignUpForm` are separate components that own their fields, validation and guidance, and emit their values on submit. Mount only the active form, so each starts fresh when its tab is selected.
- **Tab bar.** A `role="tablist"` with an accessible name, holding two native `<button type="button" role="tab">` elements with `aria-selected`. The active tab is filled with the primary colour and light text, hover uses the same fill, and the visible focus outline stays. The tabs share the card's width equally.
- **Label the tabs by who the user is, not by the action,** so the choice answers "which one am I?" ("I'm new" / "I have an account"). The tab order and the default tab follow the more common visitor: sign-up first when most visitors are new, sign-in first when most are returning.
- **The heading follows the tab.** The card's `<h1>` changes with the mode ("Create your account" / "Sign in") and labels the section with `aria-labelledby`.
- **Switching tabs clears the submission error.** Anything that only makes sense in one mode (a passkey or social button, a "forgot password" link) renders only inside that mode.
- **Complete the tabs pattern.** The active form's container is a `role="tabpanel"` with `aria-labelledby` pointing at its tab, and each tab links to it with `aria-controls`. Use a roving `tabindex` (only the selected tab is in the tab order), `ArrowLeft`/`ArrowRight` to move between tabs (wrapping) and `Home`/`End` to jump to the first and last.

## 2. Validate every field

- Validate each field: required values, email format, password rules and any field-specific constraint.
- **Define each rule once** in a shared validation module that returns the list of unmet rules, so the client and the server accept exactly the same values.
- **Validate as the user types,** once the field has been edited and its value is wrong. Don't wait for blur or for the submit button, and never show guidance on a pristine field the user only tabbed through. Remove the text the moment the value becomes valid.
- **Show only what is still missing.** Guidance shrinks as the value improves ("Add a number" rather than the whole rule set) and disappears when nothing is missing. Write each rule as an instruction ("Add…", "Use at least…"), not a verdict.
- **Submitting with a wrong field does not send.** Mark every field as edited so each wrong one shows its guidance, and move focus to the first wrong field in visual order.
- **Keep the submit button visible and enabled.** Never disable it because the form is invalid. Disable it only while the request is in flight, to prevent double submits, and keep its width stable when the label changes.

## 3. Guidance: one text per field, inline

Helper text and error text are the same thing: whatever tells the user how to get the field right.

- Render it **right under its field** in normal document flow, in the site's text colour at WCAG 2.1 AA contrast. No toasts, popups or bubbles.
- One element per field, always in the DOM (empty and `hidden` when there is nothing to say), linked with `aria-describedby`, and a polite live region (`aria-live="polite"`) so screen readers announce it. Mark the field `aria-invalid` while it shows.

### A live example for structured fields

For email and password, keep a fixed example line under the field and colour its chunks by progress. The wording never changes; only the colour of the chunks does.

- Email: `Example: name@domain.com`, with the chunks `name` `@` `domain` `.` `com`.
- Sign-up password: `Use at least: 8 characters, 1 lowercase letter, 1 uppercase letter, 1 number`, with each requirement as a chunk.
- **Met chunk:** the success colour (a dark green that keeps AA contrast as text). **Missing chunk:** the error colour, but only once the field has been edited, so a fresh form doesn't open in red. Everything else stays the default text colour. Never use the amber warning colour for validation.
- Every chunk is met exactly when the whole value is valid. Derive both from one function in the shared module (`emailParts(value)` with `isEmailValid(value)`, `signUpPasswordRules(value)`), so the example can never disagree with the form.
- Colour is not the only cue: add visually hidden text after each chunk ("(done)" / "(missing)"), and link the line to the field with `aria-describedby`.

## 4. Mark the field with the border and the ring

- The border stays at its default colour, except in two cases and only after the user has left the field (`blur`): a value with at least one character that is wrong gets the error border, and a right value gets the success border. An empty or unedited field never gets a coloured border.
- While the field has focus, the border returns to its default and the state moves to the focus ring: the global focus outline keeps its width, offset and colour, except that its colour becomes the success colour when the value is valid.
- Never recolour the typed text. Keep every indicator at 3:1 or more against the surface, and pair the colour with `aria-invalid` and the text cues above.

## 5. Passwords

### Rules that accept what the browser suggests

When the user focuses a password field, the browser or password manager offers a strong generated password. If it fails your rules, the user blames the form. Generators produce around 15 random letters and digits, sometimes with symbols (`-` `_` `:`), or about 20 characters in hyphen-separated groups, and third-party managers do the same. So:

- **Require only what every generator satisfies:** a minimum length of 8, a lowercase letter, an uppercase letter and a digit, and allow any other non-space character without requiring one: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{8,}$/`.
- **Never make a symbol mandatory,** never restrict symbols to an allowlist, never forbid hyphens, and never cap the length low (allow at least 64).
- **Declare the field:** `autocomplete="new-password"` on sign-up and `current-password` on sign-in. Optionally add Safari's `passwordrules` attribute mirroring the rule (`minlength: 8; required: lower; required: upper; required: digit`).
- **Sign-in checks only that the password is filled in.** Never apply the strength rule there; older accounts may predate it.
- Test the rule against real suggestions from the browsers you support before shipping.

### Controls inside the field

Controls sit inside the field's trailing edge as native `<button type="button">` elements with an `aria-label` and a `title`, icons marked `aria-hidden="true"`, and a visible focus outline. Wrap them in **one** positioned container (never position each button separately), reserve enough padding on the input so the typed value never slides under them, and fade them in and out (calmed under reduced motion).

- **Show/hide password:** an eye icon that appears on the first keystroke, never while the field is empty. It toggles `type="password"` and `type="text"`, exposes `aria-pressed`, and its label switches between "Show password" and "Hide password".
- **Copy password (sign-up only):** a copy icon that appears once the password passes validation, to the left of the eye, labelled "Copy password". It writes to the clipboard and handles a rejected clipboard call without breaking the form.
- **Generate password (sign-up only):** a small outlined **text** button under the field, aligned to the trailing edge ("Use suggested password"), `type="button"`. Never an icon. It fills the field with a random password that has at least one of each required class and validates it immediately, so the success state and the copy icon appear at once.

### Browser suggestions may cover the helper text

The browser's popup of saved emails or passwords can overlap the helper text. That is acceptable: a suggestion has the right structure, so choosing it satisfies the field. Don't move the text, raise its `z-index` or set `autocomplete="off"`.

## 6. Checklist

- Both modes live in one tabbed card, labelled by who the user is, with the full tabs keyboard support.
- Every field is validated on the client and again on the server, with the rules defined once.
- Guidance appears as the user types, shows only what is missing, and sits under its field as a live region.
- Submitting a wrong form focuses the first wrong field; the submit button is never disabled for invalidity.
- The sign-up password rule accepts a browser-generated password, and sign-in only checks that it is filled in.
- Show/hide appears on the first keystroke; copy and generate exist only on sign-up.
