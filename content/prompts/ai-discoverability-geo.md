# AI discoverability

How to make a public website easy for AI assistants to find, read and quote. Follow it when you build or change a public site: its rendering, `llms.txt`, `robots.txt`, sitemap, structured data and the way its pages are written.

- **The codebase wins.** If the site already generates a sitemap or `robots.txt`, extend that, don't add a second one, and mention the difference.
- **Build for three things only:** being in the models' training data, being found by their live search, and being easy to read and quote. Skip speculative formats.
- **Generate, don't hand-write.** Files that list the site's pages come from the same data that renders the pages, so they never go stale.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.

## 1. Server-render all public content

- Text, prices and links are in the initial HTML of an anonymous `GET` (server rendering or static generation). Never only behind client-side rendering, a login or a modal opened by JavaScript.
- Internal navigation uses real `<a href>` links.

## 2. Serve `/llms.txt`

Every site serves `/llms.txt` in the llmstxt.org format:

```markdown
# Site name

> One or two sentences on what the site offers and who it is for.

## Pages

- [Page title](https://example.com/page): one line on what is there.

## Docs

- [Guide](https://example.com/guide): one line.
```

- An `# H1` with the site name, a `>` blockquote summary, then `##` sections listing links to the key pages, each with a one-line description.
- Generate it from the same data that renders the pages (a route handler, not a static file). When a page or a listing is added, it appears automatically.
- An `/llms-full.txt` with the full content is optional.

## 3. Configure AI crawlers in `robots.txt` on purpose

- **Allow search and user-fetch crawlers** on public pages: `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`.
- **List the training crawlers in their own rules:** `GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`. Allow them by default, since blocking them keeps the site out of the models' knowledge. Block them only when the owner decides to.
- `robots.txt` never protects private content. The server does.

```text
User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Allow: /

Sitemap: https://example.com/sitemap.xml
```

## 4. Indexing basics

- `sitemap.xml` and `robots.txt` generated from the routes.
- A canonical URL on every page.
- A unique `<title>` and meta description per page.
- Open Graph tags.
- Remind the owner to register the site in Google Search Console and Bing Webmaster Tools.

## 5. JSON-LD on the key pages

- `Organization` and `WebSite` on the home page, with `sameAs` links to the brand's official profiles.
- The type that fits each page: `Product` with `Offer`, a `LocalBusiness` subtype, `Service`, `FAQPage` or `Article`.
- Generate it from the same data that renders the page, so every value matches the visible text.

## 6. Write content that can be quoted

- Say plainly near the top of each page who it is for and what it offers.
- Use answer-first headings: the heading is the question or the topic, and the first sentence under it is the answer.
- Prefer specific facts (prices, locations, numbers, supported technologies, dates) over slogans.
- Add FAQ sections for real questions people ask.
- Keep the brand and product names identical everywhere.

## 7. What not to add

- **No unestablished manifests** such as `agents.json` or `agent-card.json`.
- **Markdown versions and agent APIs only on request.** `Accept: text/markdown` negotiation, `.md` alternates, `openapi.json` and similar endpoints are project decisions. When added, the Markdown must match the HTML content, and every action endpoint follows the project's authorization rules.

## 8. Project facts

The business type, location and key actions an agent can take belong in the project's own instruction file, not here.

## 9. Checklist

- Public text, prices and links are in the initial HTML.
- `/llms.txt` exists and is generated from the page data.
- `robots.txt` names the AI crawlers deliberately; search and user-fetch bots are allowed.
- Sitemap, canonical URLs, unique titles and descriptions, and Open Graph tags are in place.
- JSON-LD matches the visible text.
- Each page says near the top who it is for and what it offers.
