'use client';
import { useEffect } from "react";
import { enableGhostMode, disableGhostMode, isGhostMode } from "@/lib/privacy";
import { scrubAllData } from "@/lib/vault";
import { eventBus } from "@/lib/eventBus";

/**
 * useHotkeys
 * - Uses `e.code` for reliable key detection across layouts
 * - Ignores keystrokes while typing into inputs/textareas/contenteditable
 * - Toggles ghost mode via privacy helpers and emits ui:ghost
 * - Prevents default for handled combos
 */
export function useHotkeys() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ignore while focused in text input / textarea / contenteditable
      const active = (document && document.activeElement) as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        const editable = (active.isContentEditable === true);
        if (tag === "INPUT" || tag === "TEXTAREA" || editable) return;
      }

      // only handle combinations with Shift pressed
      if (!e.shiftKey) return;

      // Use `code` (KeyQ, KeyX, KeyN) for layout consistency
      switch (e.code) {
        case "KeyQ": {
          e.preventDefault();
          // Toggle global ghost mode
          if (isGhostMode()) {
            disableGhostMode();
          } else {
            enableGhostMode();
          }
          try { eventBus.emit("ui:ghost", { on: isGhostMode() }); } catch {}
          break;
        }

        case "KeyX": {
          e.preventDefault();
          // Panic wipe
          // keep confirmation and the existing scrub flow
          // NOTE: scrubAllData already handles being safe in non-browser envs
          // Confirm visually with the user
          // eslint-disable-next-line no-alert
          if (confirm("Panic: wipe all local Zecrete data? This cannot be undone.")) {
            scrubAllData().then(() => {
              try { location.reload(); } catch {}
            });
          }
          break;
        }

        case "KeyN": {
          e.preventDefault();
          // Notebook toggle event
          try { eventBus.emit("ui:notebook:toggle", {}); } catch {}
          break;
        }

        default:
          break;
      }
    }

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
}
