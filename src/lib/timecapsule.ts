// src/lib/timecapsule.ts
import type { TxRecord } from "@/lib/types";

/**
 * Build frames for replay: group transactions by timestamp buckets.
 * Returns sorted unique times and a mapping time->txs.
 */
export function makeReplayFrames(txs: TxRecord[], bucketSeconds = 3600) {
  const map = new Map<number, TxRecord[]>();
  for (const tx of txs) {
    const bucket = Math.floor(tx.timestamp / bucketSeconds) * bucketSeconds;
    const arr = map.get(bucket) || [];
    arr.push(tx);
    map.set(bucket, arr);
  }
  const times = Array.from(map.keys()).sort((a,b)=>a-b);
  return { times, map };
}
