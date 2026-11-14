# Landing pages and hero sections

How to build a hero that explains the site at first sight, and the images and trust cues around it. Follow it whenever you create or change a landing page, a home page or the first screen of any page that has to convince a visitor.

- **The codebase wins.** If the project already has a hero or landing structure, extend it, don't mix two, and mention the difference.
- **Say it plainly.** The first screen tells a stranger what this is, in words they understand, before it tries to impress.
- **Nothing in the first view is cut off.** Text and calls to action always stay whole and readable, on tall and short screens alike.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.

## 1. The hero answers four questions

At first sight, without scrolling, the headline, the subline and the call to action together answer:

1. **What is this?**
2. **Who is it for?**
3. **Why should I care?**
4. **What should I do next?**

Test a draft by showing it to someone for five seconds and asking them the four questions.

## 2. Trust cues, real ones only

Add cues that are real and verifiable: a number of users or downloads, recognisable logos, a short quote with a name, ratings, a security or guarantee note. **Never invent them.** If there is nothing true to show yet, show nothing rather than something made up.

## 3. Imagery is produced, not raw

- **Content images (not icons) never appear raw.** Give them a visual treatment so they look intentional and polished: a filter (`brightness`, `contrast`, `saturate`), a colour overlay or a subtle vignette.
- **When there is no well-made image,** use a diagram, a real product view, an illustration or no image at all. A weak stock photo does more harm than white space.
- **Text in front of an image must be legible against any image content.** Put a gradient overlay, a darkening or blurring filter, or a semi-transparent scrim between the image and the text.
- The call to action over an image sits on a known surface (the scrim), so its contrast doesn't depend on what the picture shows.

## 4. Fit every screen

The viewport has two sizes, and the hero has to hold for every combination: a small phone, a phone in landscape, a short laptop window, a tall monitor.

- **Use `min-height`, never `height`,** on the hero, and let the content decide the final size. Never hide overflow to force the section into one screen.
- **Use `svh` (small viewport height) for `min-height`** and for sizes that must never be cut off. `lvh` and the old `vh` ignore the mobile browser's address bar and can push content out of view.
- **Say who yields when space runs out.** Text and CTAs stay whole. The image, illustration or decoration shrinks first: give it a height limit (`max-height: min(50svh, 40rem)`, `object-fit: cover` or `contain`) and `min-height: 0` on its flex or grid item so it can shrink.
- **Keep fixed and sticky elements small on short screens,** because they take height from the content. A height media query is fine for a structural change (dropping a decorative image on a landscape phone).
- Scrolling stays available. Fluid height makes the first view right; it doesn't trap content inside one screen.

## 5. Make the medium do the work

A page isn't a billboard. Instead of giant slogans over stock photos, let the visitor experience the product: a live demo, a real product view, motion that explains, data that updates. Every ambitious element must mean something: if removing it leaves the visitor understanding exactly the same, it is decoration, so rethink it or drop it. Give heavy effects a lightweight fallback and calm them under `prefers-reduced-motion`.

## 6. Checklist

- The headline, subline and CTA answer what, who, why and what next.
- Trust cues are real, and none is invented.
- Images have a treatment, and text over them has a scrim.
- The hero uses `min-height` in `svh`, and the image is the first thing to shrink.
- It was checked at 320×568 and at about 667×375 landscape, with nothing cut off.
