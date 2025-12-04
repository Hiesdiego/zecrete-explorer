// src/lib/mock/ufvkSampler.ts
// ------------------------------------------------------------
// UFVK-SPECIFIC MOCK WALLET SAMPLER (synchronous)
// ------------------------------------------------------------
// Returns a deterministic subset of the global dataset based on the
// input UFVK string. This function is synchronous so it is safe to
// call from the client-side stores (zustand) without async flow.
//
// Implementation detail:
// - Try to use sha256Sync from /src/lib/hash.ts (Node sync crypto path).
// - If sha256Sync throws (e.g. browser), fall back to a deterministic
//   pseudo-hash implementation locally (equivalent to the fallback
//   inside src/lib/hash.ts).
//
// Switching to real scanning:
// ---------------------------
// Replace this function with a real scan function that returns the
// actual decrypted transactions for the given UFVK.
// ------------------------------------------------------------

import type { MockTransaction } from "./types";
import { sha256Sync } from "@/lib/hash";
import type { MockDataset } from "./types";

// local deterministic fallback identical in spirit to hash.ts pseudoHashHex
function pseudoHashHexSync(input: string) {
  let h = 5381 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h * 33) ^ input.charCodeAt(i)) >>> 0;
  }
  // expand into 64 hex chars deterministically
  let out = "";
  let v = h;
  while (out.length < 64) {
    out += v.toString(16).padStart(8, "0");
    v = (v * 1103515245 + 12345) >>> 0;
  }
  return out.slice(0, 64);
}

export function getMockWalletForUFVK(ufvk: string, globalDataset: MockDataset) {
  // compute a stable hex hash synchronously
  let hash: string;
  try {
    // sha256Sync throws if sync crypto unavailable — catch below
    hash = sha256Sync(ufvk);
  } catch (e) {
    hash = pseudoHashHexSync(ufvk);
  }

  // derive numeric seed from first 12 hex chars (safe parse)
  const seed = parseInt(hash.slice(0, 12), 16) >>> 0;
  let rndState = seed;

  function rnd() {
    // xorshift-ish deterministic PRNG
    rndState ^= (rndState << 13) >>> 0;
    rndState ^= (rndState >>> 17) >>> 0;
    rndState ^= (rndState << 5) >>> 0;
    return (rndState >>> 0) / 0xffffffff;
  }

  const total = globalDataset.length || 0;
  const count = 5 + Math.floor(rnd() * 16); // 5–20 txs

  const txs: MockTransaction[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count && total > 0; i++) {
    // pick unique indices deterministically
    let idx = Math.floor(rnd() * total);
    // if collision, step linearly until free (deterministic)
    let attempts = 0;
    while (used.has(idx) && attempts < total) {
      idx = (idx + 1) % total;
      attempts++;
    }
    used.add(idx);
    const src = globalDataset[idx];
    // shallow clone to avoid surprising mutations
    txs.push({ ...src });
  }

  const balance = txs.reduce((acc, t) => acc + (t.type === "incoming" ? t.value : -t.value), 0);

  return {
    ufvk,
    txs,
    balance,
    count: txs.length,
    seed: hash.slice(0, 12),
  };
}
