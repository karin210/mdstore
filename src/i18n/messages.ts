import type { Locale } from "@/i18n/routing";

/**
 * Message catalogue files, one per domain, in src/i18n/locales/{en,es}/.
 * next-intl reads a single message object, so the files are merged into one namespace: every
 * domain file wraps its keys in a matching root key (`home.json` → `{ "home": { … } }`) to keep them
 * from colliding. `common.json` is the exception and stays top-level, since its keys are global.
 */
const CATALOGUE_FILES = ["common", "home", "prompts", "promptDetail", "upload", "auth"] as const;

type EnglishMessages = typeof import("./locales/en/common.json") &
  typeof import("./locales/en/home.json") &
  typeof import("./locales/en/prompts.json") &
  typeof import("./locales/en/promptDetail.json") &
  typeof import("./locales/en/upload.json") &
  typeof import("./locales/en/auth.json");

type SpanishMessages = typeof import("./locales/es/common.json") &
  typeof import("./locales/es/home.json") &
  typeof import("./locales/es/prompts.json") &
  typeof import("./locales/es/promptDetail.json") &
  typeof import("./locales/es/upload.json") &
  typeof import("./locales/es/auth.json");

/** Shape of the merged catalogue; English is the reference both locales must match. */
export type Messages = EnglishMessages;

// Key parity: the type check fails when one locale is missing a key the other has.
type AssertCatalogue<Catalogue extends Messages> = Catalogue;
type AssertReference<Catalogue extends SpanishMessages> = Catalogue;
export type CheckedCatalogues = [AssertCatalogue<SpanishMessages>, AssertReference<EnglishMessages>];

/** Loads and merges every catalogue file of a locale. */
export async function loadMessages(locale: Locale): Promise<Messages> {
  const files: { default: Record<string, unknown> }[] = await Promise.all(
    CATALOGUE_FILES.map((file) => import(`./locales/${locale}/${file}.json`)),
  );
  const merged = files.reduce<Record<string, unknown>>((all, file) => ({ ...all, ...file.default }), {});
  return merged as Messages;
}

/** Narrows a `trans.raw()` list (highlights, steps…) to strings; raw() is untyped. */
export function messageList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
