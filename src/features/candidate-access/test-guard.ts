"use client";

import * as React from "react";
import { toast } from "@/components/ui";
import type { TestIntegrity } from "@/types/psychometrics";

/**
 * Integrity measures while a test is open. They deter and record; they can't make an unsupervised browser test
 * cheat-proof (a determined person can open developer tools from the browser menu or use a second device), so
 * everything blocked is also counted and shown to HR as something to ask about, never as proof.
 *
 * Blocks: copy, cut, paste, the right-click menu, and the developer-tools, view-source, save, print and
 * select-all shortcuts. Counts: each of those, plus every time the candidate leaves the window and for how long.
 * Answer keys never reach the browser at all (candidate-access.loadTest strips them), which is the real protection.
 */
export function useTestGuard(active: boolean) {
  const counts = React.useRef<TestIntegrity>(empty());
  const awayFrom = React.useRef<number | null>(null);
  const told = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!active) return;
    const c = counts.current;
    // One gentle notice per kind of thing, so the candidate knows without being nagged.
    const tell = (kind: string, title: string, body: string) => {
      if (told.current.has(kind)) return;
      told.current.add(kind);
      toast.info(title, body);
    };

    const onClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.type === "paste") c.pasteBlocked++;
      else c.copyBlocked++;
      tell("clipboard", "Copy and paste are off during tests", "Answer in your own words. This is noted for the recruitment team.");
    };
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      c.contextMenuBlocked++;
    };
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.code;
      const blocked =
        k === "F12" ||
        // Developer tools: Ctrl+Shift+I/J/C (Windows, Linux), Cmd+Option+I/J/C (Mac).
        (mod && (e.shiftKey || e.altKey) && (k === "KeyI" || k === "KeyJ" || k === "KeyC")) ||
        // View source, save, print, select all.
        (mod && !e.shiftKey && (k === "KeyU" || k === "KeyS" || k === "KeyP" || k === "KeyA"));
      if (!blocked) return;
      e.preventDefault();
      e.stopPropagation();
      c.shortcutsBlocked++;
      tell("shortcut", "That shortcut is off during tests", "Stay on this page until you finish. This is noted for the recruitment team.");
    };
    const leave = () => {
      if (awayFrom.current !== null) return;
      awayFrom.current = Date.now();
      c.leftWindow++;
    };
    const back = () => {
      if (awayFrom.current === null) return;
      c.awaySeconds += Math.round((Date.now() - awayFrom.current) / 1000);
      awayFrom.current = null;
      tell("away", "You left the test", "Leaving this window during a test is noted for the recruitment team.");
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? leave() : back());

    document.addEventListener("copy", onClipboard, true);
    document.addEventListener("cut", onClipboard, true);
    document.addEventListener("paste", onClipboard, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", leave);
    window.addEventListener("focus", back);
    return () => {
      document.removeEventListener("copy", onClipboard, true);
      document.removeEventListener("cut", onClipboard, true);
      document.removeEventListener("paste", onClipboard, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", back);
    };
  }, [active]);

  /** What was noticed so far, closing any time away still open. */
  const read = React.useCallback((): TestIntegrity => {
    const c = { ...counts.current };
    if (awayFrom.current !== null) c.awaySeconds += Math.round((Date.now() - awayFrom.current) / 1000);
    return c;
  }, []);
  return read;
}

function empty(): TestIntegrity {
  return { leftWindow: 0, awaySeconds: 0, pasteBlocked: 0, copyBlocked: 0, shortcutsBlocked: 0, contextMenuBlocked: 0 };
}

/** Answers chosen within this long of a question appearing are counted as implausibly fast (timed tests only). */
export const FAST_ANSWER_MS = 2000;
