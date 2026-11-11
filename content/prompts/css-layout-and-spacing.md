# CSS layout and spacing

How to arrange elements so the layout is set in one place, spacing comes from tokens, and a reset removes the browser's defaults. Follow it whenever you write or review CSS for a page, a component or a layout.

- **The codebase wins.** If the project already has a layout or spacing convention, follow it, don't mix the two, and mention the difference.
- **The parent arranges its children;** the children never position themselves.
- **No raw spacing values** inside components. Every spacing value is a token.

## 1. Positioning: wrap the group, don't pull out the children

`position: absolute` is applied only to a parent or wrapper element, never to individual sibling children. Removing an element from the document flow affects all its siblings, so absolutely positioning children one by one cascades into every sibling needing the same treatment.

Wrap the group of elements that need to float together in a single parent and apply `position: absolute` to that parent. The children keep their normal flow relative to the wrapper.

If children are hidden behind an absolutely positioned sibling, don't fix it by absolutely positioning each child. Wrap them in a parent and set `position: absolute` on the wrapper to bring the whole group to the correct stacking layer.

## 2. The parent arranges its children

Layout arrangement (spacing, alignment, direction, wrapping, track sizing) is set on the container, at every level: page sections, card contents, form fields, button rows, list items.

- Use `display: flex` or `grid`, with `gap`, `align-items`, `justify-content` and `grid-template-*` on the parent.
- **Exception: inline text** (`<strong>`, `<a>`, `<code>` inside a paragraph). It flows with the words and must not become flex or grid items.
- **Separate siblings with `gap` on the parent,** not with `margin` or `padding` on the children. Page sections are separated by a `gap` on `main`.
- **A child's own `padding`** is for the space between its border and its own content (a card's inner padding), never for spacing it away from its siblings.
- **Use `margin` on an individual element only when it is the only way** (`margin-inline: auto` to centre a block, `margin-left: auto` to push one flex item to the far edge), and keep it local and minimal.

This keeps layout in one intuitive place: changing an arrangement means editing one rule instead of hunting through every child.

### Prose exception

Long-form content (articles, blog posts, Markdown or CMS output) arrives as raw sibling elements that need typographic rhythm: a heading wants more space above than below, and paragraphs sit closer together than sections. For prose, spacing may be set by rules on the prose wrapper (a vertical `gap`, or margins on the elements inside it such as `* + *` or `h2`), as long as they live in one place, the wrapper's stylesheet. The same tokens apply.

## 3. All spacing is tokenised

Every spacing value (`gap`, `padding`, `margin`, `line-height`, `letter-spacing`) references a custom property defined on `:root`, never a raw value inside a component:

```css
:root {
  --space-s: clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem);
  --space-m: clamp(1rem, 0.8rem + 1vw, 1.5rem);
  --space-l: clamp(1.5rem, 1rem + 2vw, 3rem);
  --line-height-body: 1.6;
  --letter-spacing-heading: -0.01em;
}
```

- Tokens define a fixed set of sizes for the site's elements, which keeps them uniform and makes a global spacing change a one-line edit.
- Define them with `clamp()` and relative units so they stay fluid.

## 4. Normalisation: baseline rules, once

Applied once in the global stylesheet (a reset layer), so components never repeat them.

- **Tap highlight:** set `-webkit-tap-highlight-color: transparent` on `button`, `a` and `[role="button"]`, so tapping them on touch devices doesn't flash the default highlight box. Keep the `:focus-visible` outlines intact so keyboard users still get visible feedback.
- **Box sizing:** use `box-sizing: border-box`. It is mandatory on parent and wrapper components and on all direct children of `body`; it is strongly recommended, but not required, on every descendant below that level.

## 5. Checklist

- `position: absolute` is on a wrapper, never on sibling children one by one.
- Containers use flex or grid with `gap`; children carry no margins to push themselves into place.
- Every spacing value is a `:root` token built with `clamp()`.
- The reset is global and handles the tap highlight and `box-sizing`.
