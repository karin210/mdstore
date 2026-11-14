import {
  InvalidResponseError,
  parse_prompt_details,
  parse_prompt_list,
  type PromptDetails,
  type PromptSummary,
} from "./validation.js";

/** What went wrong talking to the API, so each command can say it plainly. */
export type ApiErrorKind = "not_found" | "paid" | "network" | "server" | "invalid_response";

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
  ) {
    super(message);
  }
}

const request_timeout_ms = 15_000;

/** Client for the site's read-only JSON API (src/app/api/v1/prompts in the mdstore repo). */
export class ApiClient {
  constructor(
    readonly base_url: string,
    private readonly fetch_fn: typeof fetch = fetch,
  ) {}

  /** The prompt's page on the site, for messages. */
  page_url(slug: string): string {
    return `${this.base_url}/prompts/${slug}`;
  }

  private async request(api_path: string, slug?: string): Promise<Response> {
    const url = `${this.base_url}/api/v1${api_path}`;
    let response: Response;
    try {
      response = await this.fetch_fn(url, {
        headers: { "User-Agent": "mdstore-cli" },
        signal: AbortSignal.timeout(request_timeout_ms),
      });
    } catch (error) {
      const reason = error instanceof Error ? (error.cause instanceof Error ? error.cause.message : error.message) : "";
      throw new ApiError(
        "network",
        `Couldn't reach mdstore at ${this.base_url}${reason ? ` (${reason})` : ""}. Check your connection, or set MDSTORE_API_URL.`,
      );
    }

    if (response.ok) return response;
    if (response.status === 404 && slug) {
      throw new ApiError(
        "not_found",
        `There is no prompt called "${slug}" on mdstore. Try \`mdstore search <words>\`.`,
      );
    }
    if (response.status === 403 && slug) throw this.paid_error(slug);
    const message = await read_error_message(response);
    throw new ApiError("server", `mdstore answered ${response.status}${message ? `: ${message}` : ""}.`);
  }

  paid_error(slug: string): ApiError {
    return new ApiError(
      "paid",
      `"${slug}" is a paid prompt, which is not available from the CLI yet. Get it from ${this.page_url(slug)}.`,
    );
  }

  private async read_json(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new ApiError("invalid_response", "mdstore sent an answer that isn't valid JSON.");
    }
  }

  private parse<Value>(parse: (value: unknown) => Value, value: unknown): Value {
    try {
      return parse(value);
    } catch (error) {
      if (error instanceof InvalidResponseError) {
        throw new ApiError("invalid_response", `mdstore sent an unexpected answer: ${error.message}.`);
      }
      throw error;
    }
  }

  async search(query: string): Promise<PromptSummary[]> {
    const params = new URLSearchParams();
    if (query.trim() !== "") params.set("q", query.trim());
    const search = params.size > 0 ? `?${params}` : "";
    const response = await this.request(`/prompts${search}`);
    return this.parse(parse_prompt_list, await this.read_json(response));
  }

  async get_prompt(slug: string): Promise<PromptDetails> {
    const response = await this.request(`/prompts/${encodeURIComponent(slug)}`, slug);
    const details = this.parse(parse_prompt_details, await this.read_json(response));
    if (details.slug !== slug) throw new ApiError("invalid_response", `mdstore answered for "${details.slug}".`);
    return details;
  }

  /** The raw .md of a free prompt. */
  async get_prompt_file(slug: string): Promise<string> {
    const response = await this.request(`/prompts/${encodeURIComponent(slug)}/file`, slug);
    return response.text();
  }
}

async function read_error_message(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === "string" ? body.message : "";
  } catch {
    return "";
  }
}
