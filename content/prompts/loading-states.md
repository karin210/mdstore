# Loading states

What the interface shows while something asynchronous happens, and when it fails or comes back empty. Follow it for every data fetch, form submission, mutation, upload, authentication call, route transition that waits on data and lazy-loaded piece of content.

- **The codebase wins.** If the project already has a spinner, skeleton or status component, reuse it and mention any gap.
- **Never leave the user staring at a frozen or blank screen.** Every async operation has a visible state.
- **Every async view handles four outcomes:** loading, success, empty and error.

## 1. Track an explicit status

Keep one status per operation: `idle`, `loading`, `success` or `error`. Don't infer "loading" from empty data, because empty is also a valid result.

- Wrap it in one small reusable holder (a class, a hook or a composable) with a `run(task)` that sets `loading`, runs the task, stores the result or the error, and **always clears the loading state in a `finally`**. A failed request must never leave the UI loading forever.
- Name the status by what it tracks (`bookingsStatus`, `saveStatus`), not just `isLoading`.

## 2. Make the loader match the content

- **Content areas (lists, cards, tables, images): skeleton placeholders** that mirror the final layout, so the page doesn't jump when the data arrives. Reserve the space with a fixed `aspect-ratio` or `min-height` so nothing shifts.
- **Small actions: an inline spinner** or progress indicator next to or inside the control.
- **Measurable progress (uploads, imports): a determinate progress bar** with a percentage.
- **Route transitions that wait on data:** show the shell of the next page with skeletons rather than a blank screen.

## 3. Buttons reflect in-flight actions

- The button that triggered the request shows its busy state (a spinner, or a label such as "Saving…") and is **disabled while the request is in flight**, so a second click can't send it twice.
- **Keep its width stable.** Set a minimum width or reserve space for the longest label, so the label change doesn't move the layout.
- Outside the in-flight case, don't disable a submit button because a form is invalid. Let the user press it and explain what is wrong.

## 4. Don't flash for fast operations

- Delay showing a loader briefly (about 150–300 ms), so a quick response never flickers a spinner.
- Once a loader is shown, keep it visible for a minimum time (about 300–500 ms), so it doesn't blink away.

## 5. Pair loading with empty and error states

- **Empty:** a helpful message that says why there is nothing and what to do next ("No bookings yet. Create your first one."), with a clear action. Not a blank area.
- **Error:** a clear message in the user's terms and a **retry** action. Show the server's safe message or a local fallback, never a raw `error.message`.
- **Success after a mutation:** confirm it (a short message, a changed state), so the user knows it worked.

## 6. Make it accessible

- Mark the updating region with `aria-busy="true"` while it loads.
- Announce changes politely: `role="status"` or `aria-live="polite"` on the element that carries the loading, success and error messages.
- Keep focus sensible. Don't steal it when a loader appears, and move it to the error message or the first result when it matters.
- Meet WCAG 2.1 AA contrast on spinners, skeletons and messages.
- Respect `prefers-reduced-motion`: calm or remove spinner rotation and skeleton shimmer.

## 7. Build the loaders once

Spinners and skeletons are reusable components (`LoadingSpinner`, `SkeletonBlock`) styled with the project's colour tokens, never redefined per page and never written with raw colour values.

## 8. Checklist

- The operation has an explicit status, and the loading flag is cleared in a `finally`.
- The loader matches the content and the layout doesn't jump when the data arrives.
- The button shows its busy state, is disabled in flight and keeps its width.
- Fast responses don't flicker.
- Empty and error states exist, and the error has a retry.
- The region is announced to assistive technology and calm under reduced motion.
