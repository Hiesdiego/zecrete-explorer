// src/lib/workers/advanced-scanner.worker.ts
/**
 * Advanced scanner worker (module worker)
 *
 * Responsibilities:
 * - Incremental scanning of compact blocks (mock or real)
 * - Decrypt notes using decryptWithUfvk (WASM-ready)
 * - Emit progress updates and partial results for streaming UI
 * - Support cancelation via message type "cancel" and requestId
 * - Compute lightweight statistics in-worker to reduce main thread load
 *
 * Messages IN:
 *  { type: "scan", requestId, ufvk, params }
 *  { type: "cancel", requestId }
 *
 * Messages OUT:
 *  { type: "progress", requestId, progress }
 *  { type: "partial", requestId, transactions[], stats }
 *  { type: "done", requestId, result }
 *  { type: "error", requestId, error }
 */

import { generateMockCompactBlocks } from "@/lib/blockchain/mock-blocks";
import { decryptWithUfvk } from "@/lib/decrypt/mock-decrypter";
import type { ScanParams } from "@/lib/types";

type InMsg =
  | { type: "scan"; requestId: string; ufvk: string; params: ScanParams }
  | { type: "cancel"; requestId: string };

let activeJobs: Record<string, { cancelled: boolean }> = {};

function now() {
  return Math.floor(Date.now() / 1000);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

self.onmessage = async (ev: MessageEvent<InMsg>) => {
  const msg = ev.data;
  if (msg.type === "scan") {
    const { requestId, ufvk, params } = msg;
    activeJobs[requestId] = { cancelled: false };
    try {
      // If user requested offline mock blocks, we generate them
      const blocks = generateMockCompactBlocks(ufvk || "demo", params.startHeight ?? 2850000, 120);

      // Stream progress as we "process" blocks
      const totalBlocks = blocks.length;
      const batchSize = 8;
      const partialTxs: any[] = [];
      let processed = 0;

      for (let i = 0; i < blocks.length; i += batchSize) {
        if (activeJobs[requestId].cancelled) {
          self.postMessage({ type: "error", requestId, error: "scan_cancelled" });
          delete activeJobs[requestId];
          return;
        }

        // pretend to fetch a batch and decrypt with UFVK (mock or wasm)
        const slice = blocks.slice(i, i + batchSize);
        // In a real wasm flow, you'd await wasm.decryptBatch(ufvkBytes, slice)
        await sleep(80 + Math.floor(Math.random() * 60));
        const decryptRes = await decryptWithUfvk(ufvk, { startHeight: params.startHeight, endHeight: params.endHeight });

        // Add partial txs (we'll push a random few for demo streaming)
        const take = Math.min(decryptRes.transactions.length, Math.floor(Math.random() * 4) + 1);
        for (let k = 0; k < take; k++) partialTxs.push(decryptRes.transactions[k]);

        processed += slice.length;
        const percent = Math.min(100, Math.floor((processed / totalBlocks) * 100));
        self.postMessage({ type: "progress", requestId, progress: { current: processed, total: totalBlocks, percentage: percent, status: percent < 100 ? "scanning" : "decrypting" } });

        // Send partial batch results (main thread risk engine will re-assess)
        self.postMessage({ type: "partial", requestId, transactions: partialTxs.splice(0, partialTxs.length), stats: { processed, totalBlocks } });
      }

      // Finally call decryptWithUfvk for final aggregated result
      const final = await decryptWithUfvk(ufvk, params);
      self.postMessage({ type: "done", requestId, result: final });
      delete activeJobs[requestId];
    } catch (err: any) {
      self.postMessage({ type: "error", requestId: msg.requestId, error: err?.message || String(err) });
      delete activeJobs[requestId];
    }
  } else if (msg.type === "cancel") {
    const j = activeJobs[msg.requestId];
    if (j) j.cancelled = true;
  }
};

export {};
