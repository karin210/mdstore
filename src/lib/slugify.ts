/** Lowercase kebab-case ASCII (accents dropped), at most `maxLength` characters; "" when nothing is left. */
export function slugify(valueRaw: string, maxLength = 60): string {
  return valueRaw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}
