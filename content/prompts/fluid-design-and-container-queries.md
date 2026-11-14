# Fluid design and container queries

How to make a layout scale continuously with the screen and with the space a component sits in, instead of jumping between breakpoints. Follow it whenever you size a layout, write responsive CSS, or build a component that can be placed in spaces of different widths.

- **The codebase wins.** If the project already has a responsive approach, follow it, don't mix the two, and mention the difference.
- **Fluid over breakpoints.** Let sizes, spacing and tracks scale, and add a media query only for a structural change that fluid values can't express.
- **Fluid in both dimensions.** The viewport has a width and a height, and the layout must hold for every combination.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.

## 1. Fluid by default

Use `clamp()`, `min()`/`max()`, relative units (`rem`, `%`, `vw`/`vh`) and custom properties. Avoid fixed pixel widths for layout containers.

- Let tracks size themselves with intrinsic grids: `repeat(auto-fit, minmax(16rem, 1fr))`.
- Add a media query only for a structural change fluid values can't express, such as swapping a navigation bar for a menu.

## 2. Width and height

A layout that only reacts to width breaks on short screens: a hero with a heading block above an image, for example, gets its image cut off on a short phone.

- **Content that must be fully seen never gets a fixed height.** Use `min-height`, never `height`, and let the content decide the final size. Never hide overflow to force a section into one screen.
- **Use the viewport height unit that matches mobile browsers:**
  - `svh` (small viewport: address bar shown) guarantees the content fits in any state. Use it for `min-height` and for sizes that must never be cut off.
  - `dvh` follows the bar as it shows and hides. Use it only where a changing size is acceptable.
  - `lvh` and the old `vh` ignore the bar and can push content out of view on phones.
- **Say who yields when space runs out.** Text and calls to action always stay whole and readable; the image, illustration or decoration shrinks first. Size media with a height limit (`max-height: min(50svh, 40rem)`, `object-fit: cover` or `contain`) and give the flex or grid child `min-height: 0` so it can actually shrink.
- **Cap vertical spacing by height too:** `clamp(min, min(4vw, 4svh), max)`, or use `svmin`/`vmin` to follow the smaller dimension.
- **A height media query is allowed** for a structural change (`@media (max-height: 30rem)` on a landscape phone, to drop a decorative image, shrink a sticky header or switch a hero from stacked to side by side). Keep fixed and sticky elements small on short screens.
- **Scrolling stays available.** Fluid height makes the first view right; it doesn't replace scrolling or trap content in one screen.

## 3. Size things by the space they have

- **Page layout** (header, navigation, columns, sections) follows the screen: fluid values first, a media query only when needed.
- **A component that can sit in different spaces** (a card in a grid, a sidebar, a modal) follows the width of the space it is in, so use a **container query**. Don't use a screen-width media query to fix a component that should adapt to where it is placed.

## 4. Container queries: how to use them

- **The parent declares the container; the component never queries itself.** Put `container-type: inline-size` (and a name, `container: card-slot / inline-size`) on the wrapper that gives the component its width, and style the component's inside with `@container card-slot (...)`.
- **Mobile-first default, query as an enhancement.** The component's base styles already work at the narrowest container; `@container (min-width: ...)` adds the roomier arrangement. Without container support the component still works, only less refined.
- **Thresholds come from the component's content,** not from device widths. Pick the width where the content stops fitting (a card's image moving beside its text) and write it in `rem` or `ch`. Prefer one or two thresholds per component; if it needs more, make the sizes fluid instead.
- **Use `cqi` for continuous scaling inside a container:** `clamp(var(--space-s), 4cqi, var(--space-l))` for inner padding, gap or type. Keep the `clamp()` bounds, built from the spacing and text tokens. Outside any container `cqi` falls back to the small viewport.
- **Know what containment does.** `inline-size` containment means the container's width can't depend on its content: it needs a definite width from its parent (a grid or flex track, a percentage, a `max-width`), or it collapses. It also makes the container the containing block for absolutely and fixed positioned descendants, so check dropdowns, tooltips and modals placed inside it.
- **Don't nest containers without need.** A `cqi` or `@container` rule resolves against the nearest ancestor container, so name them when more than one exists and query by name.
- **Width by default.** `container-type: inline-size` measures width only. Use `container-type: size` (which also gives `cqb` units and height queries) only when the component's own height is fixed by its parent; it needs a definite height or it collapses.
- **Check support before going beyond size queries.** Size container queries (`@container`, `cqi`) are baseline. Style queries (`@container style(...)`) and `container-type: scroll-state` are newer: check Can I use first and keep a fallback.

## 5. Test it

- Test the **component** at its narrowest and widest container: resize the container, not only the window, because the viewport width no longer tells which layout it shows.
- Test the **page** at small and short viewports, such as 320×568 and a landscape phone at about 667×375, and check that no text, call to action or image is cut off in the first view.

## 6. Checklist

- Sizes and spacing use `clamp()` and relative units, with few media queries.
- Hero and full-screen sections use `min-height` in `svh`, never a fixed height.
- Media is the first thing to shrink; text and calls to action stay whole.
- Reusable components follow their container with `@container` and `cqi`, with a mobile-first base.
- Containers have a definite width, and nested ones are named.
