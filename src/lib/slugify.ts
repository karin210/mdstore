/** Lowercase kebab-case ASCII (accents dropped), at most `max_length` characters; "" when nothing is left. */
export function slugify(value_raw: string, max_length = 60): string {
  return value_raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max_length)
    .replace(/-+$/g, "");
}
