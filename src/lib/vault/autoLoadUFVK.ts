// src/lib/vault/autoLoadUFVK.ts
import { useWalletStore } from "@/lib/store/walletStore";
import { eventBus } from "@/lib/eventBus";
import { getAllUnlockedKeys } from "../vault";

/**
 * After password unlock, automatically load the first unlocked UFVK into walletStore
 * This is REQUIRED for the demo to work in new tabs with password-only unlock
 */
export function autoLoadUFVKOnUnlock() {
  const walletStore = useWalletStore;

  const loadFirstKey = () => {
    try {
      const unlocked = getAllUnlockedKeys();
      if (unlocked.length > 0) {
        const first = unlocked[0];
        if (first.ufvk) {
          console.debug("Auto-loading UFVK from vault:", first.ufvk.slice(0, 20) + "...");
          walletStore.getState().setUFVK(first.ufvk, { force: true });
          eventBus.emit("wallet:loaded", { ufvk: first.ufvk });
        }
      }
    } catch (e) {
      console.warn("Failed to auto-load UFVK", e);
    }
  };

  // Run on these events (after password unlock)
  eventBus.on("session:unlocked", loadFirstKey);
  eventBus.on("vault:key-unlocked", loadFirstKey);

  // Also run immediately in case already unlocked
  setTimeout(loadFirstKey, 500);
}