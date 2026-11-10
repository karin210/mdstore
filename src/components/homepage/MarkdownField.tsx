"use client";

import { useEffect, useRef, type ReactElement } from "react";

type NavigatorHints = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };

/**
 * Whether this visitor gets the animated field. Reduced motion, data saver and low-memory devices keep the
 * static backdrop, which is also what visitors without JavaScript see.
 */
function canAnimate(): boolean {
  const hints = navigator as NavigatorHints;
  return (
    window.matchMedia("(prefers-reduced-motion: no-preference)").matches &&
    hints.connection?.saveData !== true &&
    (hints.deviceMemory ?? 8) >= 4
  );
}

/**
 * The hero's animated backdrop. The renderer (WebGL2) is a separate chunk, downloaded only for visitors
 * who get the animation and only once the browser is idle, so it never delays the first paint.
 */
export function MarkdownField({ className }: { className?: string }): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canAnimate()) return;
    let isCancelled = false;
    let stopField: (() => void) | null = null;

    async function startField(): Promise<void> {
      const { startMarkdownField } = await import("@/lib/markdownFieldRenderer");
      if (isCancelled || !canvas) return;
      stopField = await startMarkdownField(canvas);
      if (isCancelled) stopField?.();
    }

    // Safari has no requestIdleCallback; a short timeout stands in for it.
    const hasIdleCallback = typeof window.requestIdleCallback === "function";
    const idleId = hasIdleCallback
      ? window.requestIdleCallback(() => void startField(), { timeout: 2000 })
      : window.setTimeout(() => void startField(), 800);

    return () => {
      isCancelled = true;
      if (hasIdleCallback) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      stopField?.();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
