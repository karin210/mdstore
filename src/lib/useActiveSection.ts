"use client";

import { useEffect, useState } from "react";

/**
 * The id of the section currently being read: the last one whose top has passed a reading line
 * 35% down the viewport. Recomputed on scroll and resize (once per frame); `null` before the
 * first section reaches that line.
 */
export function useActiveSection(sectionIds: readonly string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let frameId = 0;

    function findActiveSection(): void {
      frameId = 0;
      const readingLine = window.innerHeight * 0.35;
      // At the very bottom the last section is the one being read, even if it is short.
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let currentId: string | null = null;
      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= readingLine) currentId = id;
      }
      setActiveId(isAtBottom ? (sectionIds.at(-1) ?? currentId) : currentId);
    }

    function scheduleUpdate(): void {
      if (!frameId) frameId = requestAnimationFrame(findActiveSection);
    }

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [sectionIds]);

  return activeId;
}
