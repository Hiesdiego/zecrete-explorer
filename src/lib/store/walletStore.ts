// src/lib/store/walletStore.ts
// ------------------------------------------------------------
// Central client-side wallet state (Zustand)
// Defensive: avoid accidental overwrites with empty UFVK values.
// ------------------------------------------------------------

console.debug("🚨 walletStore FILE LOADED");

import { GLOBAL_MOCK_DATASET } from "@/lib/mock/global";
import { getMockWalletForUFVK } from "@/lib/mock/ufvkSampler";

import { create } from "zustand";
import type { MockTransaction } from "@/lib/mock/types";

interface WalletState {
  ufvk: string | null;
  txs: MockTransaction[];
  balance: number;
  loading: boolean;

  // Set the UFVK. If `ufvk` is falsy/empty it will be ignored unless opts.force === true
  setUFVK: (u: string | null, opts?: { force?: boolean }) => void;

  // Explicitly clear the UFVK and reset derived state
  clearUFVK: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  ufvk: null,
  txs: [],
  balance: 0,
  loading: false,

  setUFVK(ufvk: string | null, opts?: { force?: boolean }) {
    console.log("🔥 walletStore.setUFVK called with:", ufvk, "opts:", opts);

    // Defensive guard: do not accept empty/falsy ufvk values unless the caller
    // explicitly asks to force the update. This prevents accidental wiping
    // when some other initializer emits an empty UFVK during hydration.
    if (!ufvk || typeof ufvk !== "string" || !ufvk.trim()) {
      if (opts?.force) {
        console.debug("walletStore.setUFVK: forced clear/update with empty value");
        set({ ufvk: null, loading: false, txs: [], balance: 0 });
        return;
      }
      console.debug("walletStore.setUFVK: ignored empty/invalid ufvk");
      console.trace && console.trace("Ignored setUFVK called with:", ufvk);
      return;
    }

    const trimmed = ufvk.trim();

    // Mark loading so UI can show a spinner if desired
    set({ ufvk: trimmed, loading: true });

    // derive stable wallet view from the UFVK (synchronous deterministic mock)
    try {
      const wallet = getMockWalletForUFVK(trimmed, GLOBAL_MOCK_DATASET) ?? { txs: [], balance: 0 };
      set({
        txs: wallet.txs ?? [],
        balance: typeof wallet.balance === "number" ? wallet.balance : 0,
        loading: false,
      });
      console.debug("walletStore.setUFVK: wallet derived for ufvk:", trimmed.slice(0, 12) + "...");
    } catch (e) {
      console.error("walletStore.setUFVK: error deriving wallet for UFVK:", e);
      // On error, roll back to a safe empty state but keep ufvk assigned so we know it happened
      set({
        txs: [],
        balance: 0,
        loading: false,
      });
    }
  },

  clearUFVK() {
    console.debug("walletStore.clearUFVK: explicit clear called");
    set({ ufvk: null, txs: [], balance: 0, loading: false });
  },
}));
