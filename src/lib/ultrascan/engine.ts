// src/lib/ultrascan/engine.ts
// ------------------------------------------------------------
// UltraScan runs deep analysis on the *same UFVK tx subset*
// ------------------------------------------------------------

import { useWalletStore } from "@/lib/store/walletStore";

export function useUltraScan() {
  const { txs } = useWalletStore();

  // Example analytics
  const incoming = txs.filter((t) => t.type === "incoming").length;
  const outgoing = txs.filter((t) => t.type === "outgoing").length;

  const avgValue =
    txs.reduce((s, t) => s + t.value, 0) / (txs.length || 1);

  const maxRisk = Math.max(...txs.map((t) => t.riskScore));

  return {
    incoming,
    outgoing,
    avgValue,
    maxRisk,
    txs,
  };
}
