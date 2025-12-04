// src/lib/mock/ultra.ts
// Client wrapper to start the ultra-generator.worker and receive streaming batches.

export type UltraOptions = { count?: number; batchSize?: number; seed?: number; includeGemini?: boolean };

export class UltraScanner {
  worker: Worker | null = null;
  onChunk: ((batch: any[], progress: number)=>void) | null = null;
  onDone: (()=>void) | null = null;
  onCancel: (()=>void) | null = null;
  onError: ((err:any)=>void) | null = null;

  start(opts: UltraOptions = {}) {
    this.terminate();
    const w = new Worker("/workers/ultra-generator.worker.js");
    this.worker = w;
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === "chunk") {
        this.onChunk?.(m.batch, m.progress);
      } else if (m.type === "done") {
        this.onDone?.();
        this.terminate();
      } else if (m.type === "cancelled") {
        this.onCancel?.();
      }
    };
    w.onerror = (err) => this.onError?.(err);
    w.postMessage({ count: opts.count || 250, batchSize: opts.batchSize || 20, seed: opts.seed || Date.now(), includeGemini: opts.includeGemini ?? true });
    return w;
  }

  cancel() {
    if (!this.worker) return;
    this.worker.postMessage("cancel");
    this.terminate();
  }

  terminate() {
    try { this.worker?.terminate(); } catch {}
    this.worker = null;
  }
}
