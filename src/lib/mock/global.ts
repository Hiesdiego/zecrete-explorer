// src/lib/mock/global.ts
// ------------------------------------------------------------
// GLOBAL MOCK UNIVERSE (400 txs) - deterministic
// ------------------------------------------------------------
// This dataset is generated ONCE and shared everywhere:
//  - Explorer Scan
//  - UltraScan
//  - Portfolio summaries
//  - UFVK-based wallet views
//
// We seed the generator to ensure determinism across server/client.
// ------------------------------------------------------------

import { generateMockTransactions, setMockSeed } from "./generator";
import type { MockTransaction } from "./types";

const SEED = 42; // stable seed for deterministic mock corpus
setMockSeed(SEED);

const raw = generateMockTransactions(400);

// Ensure uniqueness & stable ordering
const seen = new Set<string>();
const unique: MockTransaction[] = [];
for (const t of raw) {
  if (!seen.has(t.txid)) {
    unique.push(t);
    seen.add(t.txid);
  }
}

export const GLOBAL_MOCK_DATASET: MockTransaction[] = unique;
export const GLOBAL_MOCK_DATASET_ID = `global_v1_seed_${SEED}`;
