# Web visual design and images

How to decide what a web page looks like and how it communicates, from its audience and goal down to its images. Follow it whenever you design or restyle a page, a section or a component, or add images to one.

- **The codebase wins.** If the project already has a design system, tokens or a visual style, extend them, don't mix two, and mention the difference.
- **Start from the audience and the goal,** not from a style. Every decision serves the action the page should drive or the emotion it should evoke.
- **Contrast is not optional.** Text and controls meet WCAG 2.1 AA.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.

## 1. Priority order

When rules conflict, follow the higher one: usability, then accessibility (WCAG 2.1 AA), then the project's own design rules (its colour tokens, spacing scale, button styles and navigation patterns), then the chosen art style, then ambition. Adjust the lower one only as much as needed. If the chosen style makes text fail contrast, change the style until the text passes, instead of loosening the contrast.

## 2. Start from three inputs

An interface exists to guide users to get the most out of a product's usefulness. Judge every decision by whether it helps them understand and do the next thing.

- **The inputs:** the target audience, the page's goal and the page or app description. They lead the colour palette and the whole design.
- **Where they come from, in this order:** the user's request; the project's own files (the instruction files your agent reads, the README, the package description, the existing copy, pages and translations); the existing site or app, if it can be inspected.
- **If an input is still missing,** infer it from those sources and state each assumption in one sentence in your final message. Ask the user only when the project is new and nothing hints at the audience or goal, and ask for everything missing in a single message.
- **Derive two things from the inputs:** one sentence for the action the page should drive (start a trial, read the docs, buy), and up to three emotions that fit that audience and goal (trust, calm, excitement), in order of importance. Every decision (layout, colour, motion, emphasis) must serve the action or at least one of the emotions. Rework or remove what serves neither.
- **Minimise friction toward the action.** The path to it takes the fewest steps, fields and decisions that still let the user act with confidence, and the action is the most prominent element in its area.
- **Choose resources by fit.** Use the web tools that best serve the action and the emotions, not the newest or the most impressive.

## 3. Choose the style in one pass

Style gives identity; principles make it work. Pick the art style from the brand and its message (minimalism, flat design, skeuomorphism, Material Design, neumorphism, glassmorphism, brutalism, Memphis, retro, Bauhaus), then apply the principles on top: colour, rhythm, hierarchy, contrast, spacing, usability and accessibility. The styles are starting points: blend or bend them when it fits the brand. The principles never change.

- **Weigh at most three directions yourself,** pick one, then build it. Don't ask the user to choose unless they ask to, and don't reopen the choice while building. Mention the style and the reason in one sentence in your final message so the user can redirect it.
- **References are optional input, never an invented one.** If the user provides references or you can browse, compare them against these rules and the project's own: adopt what fits, discard what conflicts. Otherwise use only those rules, and don't cite references you haven't seen. A reference overrides a rule only with a clear reason, stated to the user in one sentence.

## 4. Use the medium, don't build a billboard

A billboard says its message in one glance of text and an image. An interface lets the user act, explore and see the product work, so be as ambitious as the medium allows. Convey the message through interaction, motion, scroll and state changes, hierarchy and typography, live data, real product views and the page's own structure. Giant slogans over stock imagery are the failure to avoid.

- **Decide the page's idea once, before its first layout.** List up to three ideas only the web can do (scroll-driven animation, View Transitions, anchor positioning, container queries, canvas, WebGL or WebGPU, Web Audio and pointer APIs, real data, personalisation, live demos) and keep the one that passes the meaning test. Sections and components follow that idea; they don't each need their own.
- **Meaning test.** If removing the idea leaves the user understanding exactly the same, it is decoration. Replace it with one that tells the story, or drop it.
- **Pick among ideas that pass,** in this order: meaning (how clearly it shows what the product does or why it matters), fit (the audience understands it without explanation and it matches the brand's tone), then cost (build effort, including its fallback, and how heavy it is to run). Cost never outweighs the first two; use it only to choose between ideas that score about the same on them.
- **Ambition has a floor.** Heavy effects (WebGL, WebGPU, 3D, audio) get a lightweight fallback and a one-sentence reason why they beat a lighter option. Respect `prefers-reduced-motion`, keep native scrolling and keyboard use, and keep WCAG 2.1 AA.

## 5. Status colours: the traffic light

Use the universal convention: **red** for deletion actions, danger zones and errors; **amber** for warnings and pending states; **green** for success. Define them as status tokens and keep them at AA contrast (4.5:1 for text, 3:1 for icons, borders and large text).

- **Use just enough** to make the indication clear. Apply the colour to small elements: an icon, a border, a badge, a short label, a button. Never to big areas or to paragraphs of text.
- **Reinforce large areas with iconography,** not colour: a trash can, a warning triangle, a check mark, next to content on the normal surface.
- **Colour is never the only cue.** Pair it with an icon or text.

## 6. Images

- **No content image (not icons) appears unedited.** Every image looks intentional and polished, consistent with the palette and the surface it sits on.
- **Assess before treating.** If you can inspect the image and it is already edited (graded, balanced, fitting the palette), don't stack more adjustments on it; add only what is missing. If it is raw, apply a treatment: a CSS filter (`brightness`, `contrast`, `saturate`), a colour overlay or a subtle vignette. If you can't inspect it, treat it as unedited.
- **Apply only the adjustment that is needed,** so the image fits the design and the elements on or around it (text, buttons, badges) stand out and stay readable.
- **Elements over an image stay readable.** Text or controls in front of an image get a gradient overlay, a darkening or blurring filter, or a semi-transparent scrim, as strong as needed to stand out against any image content (4.5:1 for text, 3:1 for large text and controls).

## 7. Checklist

- The page has one stated action and up to three stated emotions, and nothing in the design serves neither.
- It has one chosen art style and one web-only idea, each with a one-sentence reason.
- Status colours are small, paired with an icon or text, and meet AA contrast.
- Content images have a treatment, and text over images has an overlay or scrim.
- `prefers-reduced-motion` is respected, and heavy effects have a lightweight fallback.
