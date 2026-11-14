# Naming variables and functions

How to name things so a developer understands what a variable holds or what a function does at first sight. Follow it whenever you create or rename a variable, a function, a handler, a prop or a field.

- **The codebase wins.** If the project already follows a different naming convention, keep it, don't mix the two, and mention the difference.
- **Name for a stranger.** Someone opening the file for the first time should know what a variable stores, or what a function is for, without reading its body or tracing where it is used.
- **Be as brief as clarity allows.** A long name is better than an unclear one, but the shortest clear name is best.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.

## 1. Variables: name by the value they store

If the value alone isn't descriptive enough, take the context into account (the function or feature that needs it) and name it by its usage.

| Too broad | Better | Why |
|---|---|---|
| `users` | `matchingUsers` | In a modal for changing a user's role, the list fetched as matches for the typed name. |
| `data` | `bookingsResponse` | Says what was fetched. |
| `list` | `visibleServices` | Says which items it holds. |

## 2. Separate the variables of one input field by role

A field such as an email has several related variables: what the user typed, the element, transformed versions. Never name any of them just `email`. Use a suffix for each role:

- `emailValue` for what the user typed.
- `emailRef` or `emailField` for the element reference.

## 3. Name transformed values by their state

When a value is transformed, the name says, as briefly and clearly as possible, what happened to it:

- `phoneValueRaw` for the original and `phoneValueTrimmed` for the trimmed one.
- The same applies to format changes (common with dates), type conversions (common with numeric input), normalisation to the database convention, and sanitisation to avoid processing errors: `birthDateIso`, `quantityNumber`, `emailNormalized`, `commentSanitized`.

## 4. Functions

- **Getters and setters** use the `get` and `set` prefixes.
- **Standalone functions** are named for the kind of processing they carry out.
- **Name by the returned value when that reads better,** especially for booleans used in conditionals: `isLogged`, `hasAccess`, `canCancel`.
- **Event handlers** may use the `on` or `handle` prefix followed by the event name: `onSubmit`, `handleKeydown`.

## 5. Include context, avoid broad names

A function that opens the content list of a services category, triggered by a button on a category card, is `openCategoryContent`, not `openContent`, which is too loose to mean anything. Naming the element it opens can make it clearer still: `openServicesModal` if it opens a modal.

## 6. Name by the goal, not by the last action the user took

| Instead of | Use | Why |
|---|---|---|
| `acceptSelection` | `setRole` | In a modal where a user and a new role are picked, the function that sends the request. `acceptSelection` describes the confirm click; `setRole` carries the goal of the modal. |
| `handleContinue` | `nextStep` | In a multi-step modal, the function that shows the next step. "Continue what?" is left unanswered; "step" is already the vocabulary of that modal. |

## 7. Consistency

- One casing per kind of name: `camelCase` for variables, functions, props and keys; `PascalCase` for components and types; `UPPER_SNAKE_CASE` for module constants.
- An outside system may own a name (database columns, error codes, cookie names). Keep its spelling where it crosses the boundary, and convert it to the project's casing as soon as it enters the code.
- Reuse the vocabulary of the feature. If the modal talks about "steps", the functions talk about steps.

## 8. Checklist

- A stranger can tell what each variable holds and each function does.
- Related variables of one field differ by a role suffix.
- Transformed values say how they were transformed.
- Handlers and booleans follow the prefixes above.
- No name is as loose as `data`, `list`, `item`, `handleClick` or `openContent`.
