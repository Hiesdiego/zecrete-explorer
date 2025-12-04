// src/hooks/usePanicHotkey.ts
import { useEffect } from "react";
import { scrubAllData } from "@/lib/vault";

export function usePanicHotkey() {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.shiftKey && e.key.toLowerCase() === "x") {
        if (confirm("PANIC: wipe Zecrete local data now? This is irreversible.")) {
          scrubAllData().then(()=> location.reload()).catch(()=> alert("Scrub failed"));
        }
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
