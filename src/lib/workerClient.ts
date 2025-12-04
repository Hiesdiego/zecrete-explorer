// src/lib/workerClient.ts
import type { ScanParams, ScanProgress, ScanResult } from "./types";

export type ScanProgressCb = (p: ScanProgress) => void;

export async function startScanWorker(ufvk: string, params: ScanParams, onProgress?: ScanProgressCb): Promise<ScanResult> {
  // Vite/Next bundlers support `new Worker(new URL(..., import.meta.url), { type: 'module' })`
  // If your bundler supports ?worker query, the import approach can be used.
  try {
    // Prefer module URL worker
    const WorkerCtor = (await import('../workers/scan-worker')).default;
    const w: Worker = new WorkerCtor();
    return wrapWorker(w, onProgress);
  } catch (e) {
    // Fallback to URL constructor
    const w = new Worker(new URL('../workers/scan-worker.ts', import.meta.url), { type: 'module' });
    return wrapWorker(w, onProgress);
  }

  function wrapWorker(w: Worker, onProgress?: ScanProgressCb): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      w.onmessage = (ev: MessageEvent) => {
        const data = ev.data as any;
        if (data.type === "progress") onProgress?.(data.progress as ScanProgress);
        else if (data.type === "done") { w.terminate(); resolve(data.result as ScanResult); }
        else if (data.type === "error") { w.terminate(); reject(new Error(data.error)); }
      };
      w.onerror = (err) => { w.terminate(); reject(err); };
      w.postMessage({ type: "scan", ufvk: ufvk, params });
    });
  }
}
