// src/components/AutoLoadUFVK.tsx
"use client";

import { useEffect } from "react";
import { getAllUnlockedKeys } from "@/lib/vault";
import { useWalletStore } from "@/lib/store/walletStore";
import { eventBus } from "@/lib/eventBus";

export function AutoLoadUFVK() {
  useEffect(() => {
    const loadFirstKey = () => {
      try {
        const unlocked = getAllUnlockedKeys();
        if (unlocked.length > 0) {
          const ufvk = unlocked[0].ufvk?.trim();
          if (ufvk && !useWalletStore.getState().ufvk) {
            console.debug("Auto-loading UFVK from vault:", ufvk.slice(0, 20) + "...");
            useWalletStore.getState().setUFVK(ufvk, { force: true });
            eventBus.emit("wallet:loaded", { ufvk });
          }
        }
      } catch (e) {
        console.warn("AutoLoadUFVK failed:", e);
      }
    };

    // Run immediately + on unlock events
    loadFirstKey();
    eventBus.on("session:unlocked", loadFirstKey);
    eventBus.on("vault:key-unlocked", loadFirstKey);

    return () => {
      eventBus.off("session:unlocked", loadFirstKey);
      eventBus.off("vault:key-unlocked", loadFirstKey);
    };
  }, []);

  // This component renders nothing
  return null;
}