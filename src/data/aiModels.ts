/**
 * The specific AI models a listing can say it was tested against, grouped by family.
 *
 * PLACEHOLDER DATA: the model list, the prices and every listing's `tested_models` are invented
 * for now. Replace them with real test results and the providers' current prices before launch.
 */

/** Model families, in the order the detail page lists them. */
export const model_families = ["claude", "chatgpt", "gemini"] as const;

export type ModelFamily = (typeof model_families)[number];

/** Brand names, shown as they are in every language. */
export const model_family_names: Record<ModelFamily, string> = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
};

export interface AiModel {
  family: ModelFamily;
  /** The exact model name, as the provider writes it. */
  name: string;
  /** US dollars per one million input tokens. */
  input_per_mtok_usd: number;
  /** US dollars per one million output tokens. */
  output_per_mtok_usd: number;
}

export const ai_models = {
  "claude-fable-5-2": { family: "claude", name: "Claude Fable 5.2", input_per_mtok_usd: 15, output_per_mtok_usd: 75 },
  "claude-opus-5-5": { family: "claude", name: "Claude Opus 5.5", input_per_mtok_usd: 5, output_per_mtok_usd: 25 },
  "claude-sonnet-5-5": { family: "claude", name: "Claude Sonnet 5.5", input_per_mtok_usd: 3, output_per_mtok_usd: 15 },
  "claude-haiku-5-5": { family: "claude", name: "Claude Haiku 5.5", input_per_mtok_usd: 1, output_per_mtok_usd: 5 },
  "gpt-5-1": { family: "chatgpt", name: "GPT-5.1", input_per_mtok_usd: 1.25, output_per_mtok_usd: 10 },
  "gpt-5-mini": { family: "chatgpt", name: "GPT-5 mini", input_per_mtok_usd: 0.25, output_per_mtok_usd: 2 },
  "gemini-3-pro": { family: "gemini", name: "Gemini 3 Pro", input_per_mtok_usd: 2, output_per_mtok_usd: 12 },
  "gemini-3-flash": { family: "gemini", name: "Gemini 3 Flash", input_per_mtok_usd: 0.5, output_per_mtok_usd: 3 },
} as const satisfies Record<string, AiModel>;

export type ModelId = keyof typeof ai_models;

/** One model a listing was tested against. */
export interface TestedModel {
  model_id: ModelId;
  /** The models that gave the best results; the detail page makes them stand out. */
  recommended: boolean;
}

/** A listing's tested models: the recommended ones first, then the others. */
export function build_tested_models(recommended: ModelId[], others: ModelId[]): TestedModel[] {
  return [
    ...recommended.map((model_id) => ({ model_id, recommended: true })),
    ...others.map((model_id) => ({ model_id, recommended: false })),
  ];
}
