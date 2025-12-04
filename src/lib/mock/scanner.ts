// src/lib/mock/scanner.ts
import { generateMockTransactions } from "./generator";

export interface MockScannerOptions {
  delay?: number;
  batchSize?: number;
  count?: number;
}

export function mockScanner(opts: MockScannerOptions = {}) {
  const { delay = 60, batchSize = 40, count = 100 } = opts;

  const all = generateMockTransactions(count);
  let cancelled = false;

  function cancel() {
    cancelled = true;
  }

  async function* scan() {
    const total = all.length;

    for (let i = 0; i < total; i += batchSize) {
      if (cancelled) return;

      const batch = all.slice(i, i + batchSize);

      await new Promise(r => setTimeout(r, delay));

      yield {
        percentage: Math.floor(((i + batchSize) / total) * 100),
        status: `Processing mock batch ${Math.ceil(i / batchSize) + 1}/${Math.ceil(total / batchSize)}`,
        partialTxs: batch,
      };
    }
  }

  return { scan, cancel };
}
