import { useEffect, useRef } from "react";
import { POST_PREVIEW_CHANNEL, type PostPreviewMessage, type PostPreviewSnapshot } from "@/lib/postPreview";

/**
 * Keeps the live preview (/upload/preview, in another tab) showing this form. See src/lib/postPreview.ts for
 * the protocol. The form becomes the previewed one when it opens in a visible tab, when its tab or window
 * gains focus, and on every edit (`edit_count` changes); it also answers a preview that just opened.
 * Browsers without BroadcastChannel simply get no preview updates.
 */
export function usePostPreviewSender(snapshot: PostPreviewSnapshot, edit_count: number): void {
  const snapshot_ref = useRef(snapshot);
  const activate_ref = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(POST_PREVIEW_CHANNEL);
    const source_id = crypto.randomUUID();
    let active_at = Date.now();

    function post(message: PostPreviewMessage): void {
      channel.postMessage(message);
    }
    function send_snapshot(): void {
      post({ type: "snapshot", source_id, active_at, snapshot: snapshot_ref.current });
    }
    function activate(): void {
      active_at = Date.now();
      send_snapshot();
    }
    function handle_visibility_change(): void {
      if (document.visibilityState === "visible") activate();
    }
    function handle_page_hide(): void {
      post({ type: "closed", source_id });
    }

    channel.onmessage = (event: MessageEvent<PostPreviewMessage>) => {
      if (event.data?.type === "request") send_snapshot();
    };
    window.addEventListener("focus", activate);
    document.addEventListener("visibilitychange", handle_visibility_change);
    window.addEventListener("pagehide", handle_page_hide);
    activate_ref.current = activate;
    if (document.visibilityState === "visible") activate();

    return () => {
      handle_page_hide();
      window.removeEventListener("focus", activate);
      document.removeEventListener("visibilitychange", handle_visibility_change);
      window.removeEventListener("pagehide", handle_page_hide);
      activate_ref.current = null;
      channel.close();
    };
  }, []);

  // Declared before the edit effect, so an edit always sends the snapshot of that same render.
  useEffect(() => {
    snapshot_ref.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (edit_count > 0) activate_ref.current?.();
  }, [edit_count]);
}
