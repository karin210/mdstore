import { slugify } from "@/lib/slugify";

/**
 * The file name a post is listed under: the uploaded file's name in kebab-case, or the slug when nothing is
 * left of it. Shared by the server actions (what gets stored) and the upload preview (what it will show).
 */
export function get_post_file_name(file_name_raw: string, slug: string): string {
  return `${slugify(file_name_raw.replace(/\.md$/i, "")) || slug}.md`;
}
