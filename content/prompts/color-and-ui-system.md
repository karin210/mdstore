# Colour system

How to build a colour palette that expresses visual hierarchy: what the eye should see first. Follow it whenever you define colours, a theme or dark mode, choose surfaces and elevation, or colour a status message.

- **The codebase wins.** If the project already has a palette or tokens, extend them, don't mix two, and mention the difference.
- **Colours are tokens.** Every colour is a custom property defined once on `:root`, and referenced by token. No raw hex values inside components.
- **Contrast is not optional.** Text and controls meet WCAG 2.1 AA.

## 1. Four semantic roles

Each role maps to one token.

- **Background (`--color-background`):** the page background, which contrasts the displayed elements. The default is an off-white such as `#F5F5F5`, but another colour may be used when it is a deliberate design choice.
  - **Justify any non-default background with meaning:** the value it conveys, how it reinforces the site's message and the emotion it should evoke (a deep green for calm and growth, a warm cream for craft and comfort, a dark navy for focus and premium, a saturated brand colour for energy). A colour picked only because it looks good or is fashionable is not a justification.
  - **Never trade off readability or trust.** The background keeps text and controls at AA contrast, stays comfortable to read for long stretches, and keeps the site feeling credible, especially where users enter data, log in or pay. If meaning and readability conflict, readability and trust win.
- **Primary (`--color-primary`):** the brand's main colour. Used in the overall layout elements such as the header and footer, and usually in the primary buttons.
  - **It is the main brand indicator:** it reminds the user which brand's site they are in. It may appear in components shared across all pages, but in a fair amount: enough to recognize the brand, never so much that it competes with the content.
  - **It may be skipped for readability and eye health.** If using it widely would hurt readability or tire the eyes (a very saturated or bright brand colour), use the logo as the indicator instead.
  - **The primary button must stand out** from what is behind it: 3:1 against its surroundings and 4.5:1 for the label. If it fails, control the surface first; only then create a brand-aligned `--color-primary-contrast` variant of the same hue.
- **Secondary (`--color-secondary`):** complements the primary with less visual weight. Used on surfaces such as cards and section backgrounds, and on helper buttons or slider pagination.
- **Tertiary or accent (`--color-tertiary`):** contrasts in hue with the primary and secondary but sits lower in the hierarchy. Used in small amounts for details such as helper tools, badges and informational toasts. It never competes with the primary, and it must not read as a status colour (red, amber, green).

## 2. Avoid pure black and pure white

Never use `#000000` or `#FFFFFF` for primary backgrounds or body text.

- **Light mode:** off-white or slate backgrounds (`#F8F9FA`, `#F4F6F8`), so elevated cards (`#FFFFFF`) pop naturally without heavy drop shadows.
- **Dark mode:** deep charcoal or navy bases (`#121212`, `#0F172A`), which avoid halation, reduce eyestrain and leave room for elevation.
- **Text neutrals:** high-contrast off-blacks (`#0F172A`, `#111827`) in light mode and off-whites (`#F8FAFC`, `#E4E4E7`) in dark mode.
- **Brand tinting:** prefer neutrals tinted toward the brand over pure grey, so surfaces stay harmonious with the palette.

## 3. Lightness shows elevation

Surfaces that sit above the background (cards, containers, menus, modals) are usually lighter than it, in light mode and in dark mode, so they read as raised without relying on heavy shadows. Keep that direction consistent across the site: lighter means raised.

Use another approach when it drives the eyes better, as long as the meaning stays clear: recessed elements (inputs, wells, code blocks) may be darker so they read as set into the page; an emphasis surface (a dark card on a light page, a brand-coloured section) can draw attention where a lighter one would not; designs that separate with borders or whitespace need little or no lightness difference. Check text contrast on every surface.

## 4. The eye goes to light

Use luminance to lead attention: the element that should be seen first is the brightest or highest-contrast one in its area, and what is secondary recedes in tone. A button's colour is chosen from the palette to fit its visual weight, driving the eye without strain.

## 5. Reading surfaces stay neutral

When text is meant to inform and not to advertise, don't colour its background. Use a variation of white with dark text, or the dark equivalent, then tune the typography to the tone of the content.

- **Formal texts stay strictly neutral:** scientific and legal texts, docs, papers, terms and policies.
- **A subtle brand tint is allowed** for blog posts and editorial content on a branded site: a very light tint of the primary or secondary (a tinted dark in dark mode), with text at AA contrast and comfortable for long reading. Never a saturated or strongly coloured reading background.

## 6. Status colours: the traffic light

Use the universal convention: **red** for deletion actions, danger zones and errors; **amber** for warnings and pending states; **green** for success. Define them as status tokens and keep them at AA contrast.

- **Use just enough** to make the indication clear. Apply the colour to small elements: an icon, a border, a badge, a short label, a button. Never to big areas or to paragraphs of text.
- **Reinforce large areas with iconography,** not colour: a trash can, a warning triangle, a check mark, next to content on the normal surface.
- **Colour is never the only cue.** Pair it with an icon or text.

## 7. Checklist

- All colours are `:root` tokens in light and dark modes, with the four roles defined.
- Any non-default background has a stated reason and passes AA contrast.
- No pure black or white for backgrounds or body text.
- Elevation reads consistently, and text contrast is checked on every surface.
- Status colours are small, tokenised and paired with an icon or text.
