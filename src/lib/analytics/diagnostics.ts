// src/lib/analytics/diagnostics.ts
/**
 * Diagnostics aggregation
 * - Suspicious pattern detection (rapid frequency, recurring destinations)
 * - Double-spend simulation (mocked by detecting same txid twice)
 * - Health scoring across keys
 */

import type { TxRecord } from "@/lib/types";

/** detect quick bursts of txs (frequency anomalies) */
export function detectFrequencyAnomalies(txs: TxRecord[], windowSeconds = 300): { periods: { start: number; end: number; count: number }[] } {
  if (txs.length === 0) return { periods: [] };
  // sort ascending
  const sorted = [...txs].sort((a, b) => a.timestamp - b.timestamp);
  const windows: { start: number; end: number; count: number }[] = [];
  let i = 0;
  while (i < sorted.length) {
    const start = sorted[i].timestamp;
    let j = i + 1;
    while (j < sorted.length && sorted[j].timestamp - start <= windowSeconds) j++;
    const count = j - i;
    if (count >= 4) windows.push({ start, end: sorted[j - 1].timestamp, count });
    i = j;
  }
  return { periods: windows };
}

/** cluster by address and return top counterparties */
export function topCounterparties(txs: TxRecord[], limit = 6): { address: string; count: number; total: number }[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const tx of txs) {
    const addr = tx.address || "unknown";
    const prev = map.get(addr) ?? { count: 0, total: 0 };
    prev.count += 1;
    prev.total += Math.abs(tx.amount);
    map.set(addr, prev);
  }
  const arr = Array.from(map.entries()).map(([address, v]) => ({ address, count: v.count, total: v.total }));
  arr.sort((a, b) => b.count - a.count);
  return arr.slice(0, limit);
}

/** mock double-spend detection: same txid with different heights */
export function detectDoubleSpends(txs: TxRecord[]) {
  const map = new Map<string, Set<number>>();
  for (const tx of txs) {
    if (!map.has(tx.txid)) map.set(tx.txid, new Set());
    map.get(tx.txid)!.add(tx.height);
  }
  const doubles = Array.from(map.entries()).filter(([, heights]) => heights.size > 1).map(([txid]) => txid);
  return doubles;
}
