import { getSupabaseEnv } from "@/lib/supabase/env";

/** The public Storage bucket that holds the screenshots authors attach to a post (see the migrations). */
export const OUTPUT_EXAMPLES_BUCKET = "output-examples";

/** File extension of a stored image by its MIME type (the database's path check allows exactly these). */
export const OUTPUT_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** A new, unguessable path in the user's own folder: `<user id>/<random id>.<extension>`. */
export function new_output_example_path(user_id: string, mime_type: string): string {
  return `${user_id}/${crypto.randomUUID()}.${OUTPUT_IMAGE_EXTENSIONS[mime_type] ?? "png"}`;
}

/** The public URL of a stored example, or null while Supabase isn't configured. */
export function output_example_url(path: string): string | null {
  const env = getSupabaseEnv();
  return env ? `${env.url}/storage/v1/object/public/${OUTPUT_EXAMPLES_BUCKET}/${path}` : null;
}
