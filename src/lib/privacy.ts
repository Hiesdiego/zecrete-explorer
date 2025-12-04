// src/lib/privacy.ts
import { eventBus } from "@/lib/eventBus";

let ghostMode = false;

export function enableGhostMode() {
  ghostMode = true;
  try { document.body.dataset.ghost = "on"; } catch {}
  try { eventBus.emit("ui:ghost", { on: true }); } catch {}
}
export function disableGhostMode() {
  ghostMode = false;
  try { document.body.dataset.ghost = "off"; } catch {}
  try { eventBus.emit("ui:ghost", { on: false }); } catch {}
}
export function isGhostMode() { return ghostMode; }

export function attachGhostHotkey() {
  // keep a simple fallback: attach a listener that uses enable/disable so the UI event is emitted
  window.addEventListener("keydown", (e) => {
    try {
      const code = e.code || "";
      const key = (e.key || "").toLowerCase();
      if (e.shiftKey && (code === "KeyG" || key === "g")) {
        if (ghostMode) disableGhostMode();
        else enableGhostMode();
      }
    } catch {}
  });
}

export function obfuscateAmount(zats: number): string {
  if (!ghostMode) return formatZEC(zats);
  return "*** ZEC";
}
export function obfuscateMemo(memo?: string): string {
  if (!ghostMode) return memo || "";
  return "••••••••••";
}

export function formatZEC(zats: number) {
  const zec = zats / 1e8;
  return `${zec.toFixed(6)} ZEC`;
}
