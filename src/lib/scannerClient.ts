// src/lib/scannerClient.ts
/**
 * ScannerClient - controls the advanced scanner worker.
 *
 * Usage:
 *   const client = new ScannerClient();
 *   const reqId = client.startScan(ufvk, params, { onProgress, onPartial, onDone, onError });
 *   // To cancel:
 *   client.cancel(reqId);
 *
 * Implementation notes:
 * - Uses module worker import when supported.
 * - Multiplexes jobs by requestId.
 * - Ensures worker termination on page unload.
 */

import type { ScanParams, ScanProgress } from "@/lib/types";

type Callbacks = {
  onProgress?: (requestId: string, p: ScanProgress) => void;
  onPartial?: (requestId: string, txs: any[], stats?: any) => void;
  onDone?: (requestId: string, result: any) => void;
  onError?: (requestId: string, err: any) => void;
};

export class ScannerClient {
  private worker: Worker | null = null;
  private pending: Map<string, Callbacks> = new Map();

  constructor() {
    this.initWorker();
    // cleanup on page unload
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => this.terminate());
    }
  }

  private async initWorker() {
    if (this.worker) return;
    try {
      // prefer bundler-friendly import
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const WorkerCtor = (await import("../workers/advanced-scanner.worker?worker")).default;
      // eslint-disable-next-line new-cap
      this.worker = new WorkerCtor();
    } catch (err) {
      // fallback: dynamic URL (may not work in some bundlers)
      try {
        this.worker = new Worker(new URL("../workers/advanced-scanner.worker.ts", import.meta.url), { type: "module" });
      } catch (e) {
        console.error("Failed to spawn scanner worker:", e);
        throw e;
      }
    }

    // capture a non-null local reference so TypeScript knows it's defined
    const worker = this.worker!;
    worker.onmessage = (ev: MessageEvent<any>) => {
      const msg = ev.data;
      const cb = this.pending.get(msg.requestId);
      if (!cb) return;

      if (msg.type === "progress") cb.onProgress?.(msg.requestId, msg.progress);
      else if (msg.type === "partial") cb.onPartial?.(msg.requestId, msg.transactions || [], msg.stats);
      else if (msg.type === "done") {
        cb.onDone?.(msg.requestId, msg.result);
        this.pending.delete(msg.requestId);
      } else if (msg.type === "error") {
        cb.onError?.(msg.requestId, msg.error);
        this.pending.delete(msg.requestId);
      }
    };

    worker.onerror = (err) => {
      // dispatch error to all pending
      for (const [id, cb] of this.pending.entries()) {
        cb.onError?.(id, err);
      }
      this.pending.clear();
      console.error("Worker error:", err);
    };
  }

  async startScan(ufvk: string, params: ScanParams, cbs: Callbacks = {}): Promise<string> {
    await this.initWorker();
    const requestId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.pending.set(requestId, cbs);
    this.worker!.postMessage({ type: "scan", requestId, ufvk, params });
    return requestId;
  }

  cancel(requestId: string) {
    if (!this.worker) return;
    this.worker.postMessage({ type: "cancel", requestId });
    this.pending.delete(requestId);
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pending.clear();
  }
}
