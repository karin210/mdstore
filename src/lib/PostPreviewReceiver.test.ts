import { describe, expect, it } from "vitest";
import type { PromptPostValues } from "@/lib/forms/PromptPostForm";
import type { PostPreviewMessage, PostPreviewSnapshot } from "@/lib/postPreview";
import { PostPreviewReceiver, type PostPreviewReceiverDeps } from "@/lib/PostPreviewReceiver";

const VALUES: PromptPostValues = {
  kind: "prompt",
  title: "",
  tagline: "",
  summary: "",
  category: "",
  meantFor: "",
  highlights: "",
  usageSteps: "",
  file: null,
  previewLineCount: "12",
  outputExamples: [],
  coauthors: [],
};

function snapshot_of(values: Partial<PromptPostValues>): PostPreviewSnapshot {
  return {
    values: { ...VALUES, ...values },
    byline: "@ana",
    post_slug: null,
    current_file: null,
    tested_with: { works_with: [], tested_models: [] },
  };
}

/** A receiver wired to a fake channel and timer, plus handles to drive them. */
function create_receiver(): {
  receiver: PostPreviewReceiver;
  sent: PostPreviewMessage[];
  deliver: (message: PostPreviewMessage) => void;
  fire_timeout: () => void;
  revoked: string[];
} {
  const sent: PostPreviewMessage[] = [];
  const revoked: string[] = [];
  const channel = {
    onmessage: null as BroadcastChannel["onmessage"],
    postMessage: (message: PostPreviewMessage) => sent.push(message),
    close: () => undefined,
  };
  let timeout_callback: (() => void) | null = null;
  let url_count = 0;
  const deps: PostPreviewReceiverDeps = {
    create_channel: () => channel,
    create_object_url: () => `blob:${++url_count}`,
    revoke_object_url: (url) => revoked.push(url),
    set_timeout: (callback) => {
      timeout_callback = callback;
      return 1;
    },
    clear_timeout: () => undefined,
  };
  const receiver = new PostPreviewReceiver(deps);
  receiver.start();
  return {
    receiver,
    sent,
    revoked,
    deliver: (message) =>
      channel.onmessage?.call(channel as unknown as BroadcastChannel, { data: message } as MessageEvent),
    fire_timeout: () => timeout_callback?.(),
  };
}

describe("PostPreviewReceiver", () => {
  it("asks the open forms for their state and says when none answers", () => {
    const { receiver, sent, fire_timeout } = create_receiver();

    expect(sent).toEqual([{ type: "request" }]);
    expect(receiver.get_state().status).toBe("waiting");
    fire_timeout();
    expect(receiver.get_state().status).toBe("no_form");
  });

  it("shows the most recently active form, so switching forms overwrites the preview", () => {
    const { receiver, deliver } = create_receiver();

    deliver({ type: "snapshot", source_id: "new-post", active_at: 10, snapshot: snapshot_of({ title: "New post" }) });
    deliver({ type: "snapshot", source_id: "revision", active_at: 5, snapshot: snapshot_of({ title: "Older" }) });
    expect(receiver.get_state().snapshot?.values.title).toBe("New post");

    deliver({ type: "snapshot", source_id: "revision", active_at: 20, snapshot: snapshot_of({ title: "Revision" }) });
    expect(receiver.get_state().status).toBe("live");
    expect(receiver.get_state().snapshot?.values.title).toBe("Revision");
  });

  it("keeps a closed form's last state until another open form answers", () => {
    const { receiver, sent, deliver } = create_receiver();

    deliver({ type: "snapshot", source_id: "a", active_at: 10, snapshot: snapshot_of({ title: "A" }) });
    deliver({ type: "snapshot", source_id: "b", active_at: 5, snapshot: snapshot_of({ title: "B" }) });
    deliver({ type: "closed", source_id: "a" });
    expect(receiver.get_state().status).toBe("closed");
    expect(receiver.get_state().snapshot?.values.title).toBe("A");
    expect(sent.at(-1)).toEqual({ type: "request" });

    // B answers the new request with its older activity time, and still takes over.
    deliver({ type: "snapshot", source_id: "b", active_at: 5, snapshot: snapshot_of({ title: "B" }) });
    expect(receiver.get_state().status).toBe("live");
    expect(receiver.get_state().snapshot?.values.title).toBe("B");
  });

  it("gives each picked image one URL and frees it once the image is removed", () => {
    const { receiver, deliver, revoked } = create_receiver();
    const image = new File(["x"], "shot.png", { type: "image/png" });
    const with_image = snapshot_of({ outputExamples: [{ id: "img", caption: "", path: null, file: image }] });

    deliver({ type: "snapshot", source_id: "a", active_at: 1, snapshot: with_image });
    deliver({ type: "snapshot", source_id: "a", active_at: 2, snapshot: with_image });
    expect(receiver.get_state().image_urls.get("img")).toBe("blob:1");

    deliver({ type: "snapshot", source_id: "a", active_at: 3, snapshot: snapshot_of({}) });
    expect(receiver.get_state().image_urls.size).toBe(0);
    expect(revoked).toEqual(["blob:1"]);
  });

  it("reads a picked file once and shows it when read", async () => {
    const { receiver, deliver } = create_receiver();
    const file = new File(["# Hello\nworld"], "hello.md", { type: "text/markdown" });

    deliver({ type: "snapshot", source_id: "a", active_at: 1, snapshot: snapshot_of({ file }) });
    expect(receiver.get_state().file).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(receiver.get_state().file).toEqual({ name: "hello.md", text: "# Hello\nworld" });

    // A fresh copy of the same file keeps the text already read.
    deliver({
      type: "snapshot",
      source_id: "a",
      active_at: 2,
      snapshot: snapshot_of({ file: new File([file], "hello.md", { lastModified: file.lastModified }) }),
    });
    expect(receiver.get_state().file?.text).toBe("# Hello\nworld");
  });
});
