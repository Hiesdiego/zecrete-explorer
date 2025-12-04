// src/lib/scan.ts
import type { ScanParams, TxRecord } from "./types";

export function startScan(ufvk: string, params: ScanParams, onProgress: (p:number)=>void): Promise<TxRecord[]> {
  return new Promise((resolve, reject) => {
    const w = new Worker("/workers/scan-worker.js");
    w.onmessage = (e: MessageEvent) => {
      const { type, value, txs } = e.data as any;
      if (type === "progress") onProgress(value);
      if (type === "done") { w.terminate(); resolve(txs as TxRecord[]); }
    };
    w.onerror = (err) => { w.terminate(); reject(err); };
    w.postMessage({ ufvk, params });
  });
}
