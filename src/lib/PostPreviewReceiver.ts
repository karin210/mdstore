import { output_example_url } from "@/lib/outputExamples";
import {
  POST_PREVIEW_CHANNEL,
  type PostPreviewMessage,
  type PostPreviewSnapshot,
  type PreviewFile,
} from "@/lib/postPreview";

/**
 * - waiting: asked the open forms for their state, no answer yet.
 * - no_form: nobody answered in time (or the browser has no BroadcastChannel).
 * - live: showing the most recently active form.
 * - closed: that form's tab closed; its last state stays until another form answers.
 */
export type PostPreviewStatus = "waiting" | "no_form" | "live" | "closed";

export interface PostPreviewState {
  status: PostPreviewStatus;
  snapshot: PostPreviewSnapshot | null;
  /** The picked file read as text, else a new version's current file; null while there is none (or it is being read). */
  file: PreviewFile | null;
  /** Browser URLs of the output examples by item id: blob: URLs for picked images, Storage URLs for saved ones. */
  image_urls: ReadonlyMap<string, string>;
}

/** What the receiver needs from the browser; injected so tests can run it without one. */
export interface PostPreviewReceiverDeps {
  create_channel: () => Pick<BroadcastChannel, "postMessage" | "close" | "onmessage"> | null;
  create_object_url: (file: File) => string;
  revoke_object_url: (url: string) => void;
  set_timeout: (callback: () => void, ms: number) => number;
  clear_timeout: (id: number) => void;
}

/** How long a new preview waits for an open form to answer before saying there is none. */
export const FORM_ANSWER_TIMEOUT_MS = 1500;

export const INITIAL_PREVIEW_STATE: PostPreviewState = {
  status: "waiting",
  snapshot: null,
  file: null,
  image_urls: new Map(),
};

function get_browser_deps(): PostPreviewReceiverDeps {
  return {
    create_channel: () => (typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(POST_PREVIEW_CHANNEL)),
    create_object_url: (file) => URL.createObjectURL(file),
    revoke_object_url: (url) => URL.revokeObjectURL(url),
    set_timeout: (callback, ms) => window.setTimeout(callback, ms),
    clear_timeout: (id) => window.clearTimeout(id),
  };
}

/**
 * Identifies a picked file across messages: each message carries a fresh copy of the File, so object identity
 * can't tell whether the author picked another one.
 */
function get_file_key(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * The preview tab's side of the channel (see src/lib/postPreview.ts): asks the open forms for their state, keeps
 * the most recently active one, reads its picked file and gives its images browser URLs. React reads it with
 * useSyncExternalStore (`subscribe` + `get_state`); every change replaces the state object.
 */
export class PostPreviewReceiver {
  private readonly deps: PostPreviewReceiverDeps;
  private state: PostPreviewState = INITIAL_PREVIEW_STATE;
  private readonly listeners = new Set<() => void>();
  private channel: ReturnType<PostPreviewReceiverDeps["create_channel"]> = null;
  private timeout_id: number | null = null;
  private source: { id: string; active_at: number } | null = null;
  /** The picked file being shown or read, so a fresh copy of the same file isn't read again. */
  private file_key: string | null = null;
  /** One blob: URL per picked image, by item id (ids are stable across messages). */
  private readonly object_urls = new Map<string, string>();

  constructor(deps: PostPreviewReceiverDeps = get_browser_deps()) {
    this.deps = deps;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly get_state = (): PostPreviewState => this.state;

  /** Opens the channel and asks the open forms for their state. */
  start(): void {
    this.channel = this.deps.create_channel();
    if (!this.channel) {
      this.set_state({ status: "no_form" });
      return;
    }
    this.channel.onmessage = (event: MessageEvent<PostPreviewMessage>) => this.receive(event.data);
    this.request_snapshots();
    this.timeout_id = this.deps.set_timeout(() => {
      if (this.state.status === "waiting") this.set_state({ status: "no_form" });
    }, FORM_ANSWER_TIMEOUT_MS);
  }

  /** Closes the channel, frees the image URLs and goes back to the initial state (so start() can run again). */
  stop(): void {
    if (this.timeout_id !== null) this.deps.clear_timeout(this.timeout_id);
    this.timeout_id = null;
    this.channel?.close();
    this.channel = null;
    this.object_urls.forEach((url) => this.deps.revoke_object_url(url));
    this.object_urls.clear();
    this.source = null;
    this.file_key = null;
    this.state = INITIAL_PREVIEW_STATE;
  }

  private request_snapshots(): void {
    this.channel?.postMessage({ type: "request" } satisfies PostPreviewMessage);
  }

  private receive(message: PostPreviewMessage | undefined): void {
    if (message?.type === "snapshot") {
      // A newer activity wins; a closed form always yields to one still open.
      const is_newer =
        this.source === null || this.state.status === "closed" || message.active_at >= this.source.active_at;
      if (is_newer) this.show(message.source_id, message.active_at, message.snapshot);
    } else if (message?.type === "closed" && message.source_id === this.source?.id) {
      this.set_state({ status: "closed" });
      // Another open form, if any, takes over.
      this.request_snapshots();
    }
  }

  private show(source_id: string, active_at: number, snapshot: PostPreviewSnapshot): void {
    this.source = { id: source_id, active_at };
    this.set_state({
      status: "live",
      snapshot,
      file: this.get_file(snapshot),
      image_urls: this.get_image_urls(snapshot),
    });
  }

  /** The file to show now; a newly picked one is read in the background and shown once read. */
  private get_file(snapshot: PostPreviewSnapshot): PreviewFile | null {
    const picked_file = snapshot.values.file;
    if (!picked_file) {
      this.file_key = null;
      return snapshot.current_file;
    }
    const key = get_file_key(picked_file);
    if (key === this.file_key) return this.state.file;
    this.file_key = key;
    void picked_file.text().then((text) => {
      if (this.file_key === key) this.set_state({ file: { name: picked_file.name, text } });
    });
    return null;
  }

  private get_image_urls(snapshot: PostPreviewSnapshot): Map<string, string> {
    const urls = new Map<string, string>();
    for (const example of snapshot.values.outputExamples) {
      if (example.file) {
        const url = this.object_urls.get(example.id) ?? this.deps.create_object_url(example.file);
        this.object_urls.set(example.id, url);
        urls.set(example.id, url);
      } else if (example.path) {
        const url = output_example_url(example.path);
        if (url) urls.set(example.id, url);
      }
    }
    // Images the author removed (or another form's images) are no longer shown.
    for (const [id, url] of this.object_urls) {
      if (urls.has(id)) continue;
      this.deps.revoke_object_url(url);
      this.object_urls.delete(id);
    }
    return urls;
  }

  private set_state(changes: Partial<PostPreviewState>): void {
    this.state = { ...this.state, ...changes };
    this.listeners.forEach((listener) => listener());
  }
}
