// src/lib/decrypt/mock-decrypter.ts
/**
 * Mock Decrypter
 * --------------
 * Produces realistic-looking TxRecord[] and ShieldedNote[] for demo and offline mode.
 *
 * Design goals:
 * - Deterministic given a seed (ufvk) so demo is reproducible across reloads.
 * - High-fidelity fields: txid, height, timestamp, pool, memo, address, confirmations.
 * - Risk fields are left to risk engine; mock may attach simple heuristics for visual polish.
 *
 * IMPORTANT:
 * - This file is a mock. Replace the exported `decryptWithUfvk` with real WASM integration
 *   when you have a Rust -> wasm module that exposes `decryptCompactBlocks(ufvk, blocks)`.
 */

import type { TxRecord, ShieldedNote, ScanParams } from "@/lib/types";
import { CONSTANTS } from "@/lib/types";

/** Simple xorshift32 PRNG for deterministic results */
function xorshift32(seed: number) {
  let x = seed >>> 0;
  return function () {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xFFFFFFFF;
  };
}

/** Hash-ish transform of UFVK to integer seed */
function seedFromUfvk(ufvk: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < ufvk.length; i++) {
    h ^= ufvk.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function pick<T>(rng: () => number, arr: readonly T[]) {
  return arr[Math.floor(rng() * arr.length)];
}

function randHex(rng: () => number, len = 64) {
  const hex = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += hex[Math.floor(rng() * hex.length)];
  return out;
}

/** Generate a realistic memo — some PII-like fragments but safe and mocked */
function generateMemo(rng: () => number) {
  const memos = [
    "Invoice #",
    "Donation",
    "Refund",
    "Payment received",
    "Subscription",
    "Tip",
    "Freelance payout",
    "",
    "",
    "",
    "Salary",
  ];
  const choice = pick(rng, memos);
  if (!choice) return undefined;
  if (choice.endsWith("#")) return `${choice}${Math.floor(rng() * 9000 + 1000)}`;
  if (rng() < 0.2) return `${choice} — thank you`;
  return choice;
}

/** Produce deterministic mock transactions for a key */
export function decryptWithUfvkMock(
  ufvk: string,
  params: ScanParams
): { transactions: TxRecord[]; notes: ShieldedNote[]; lastHeight: number } {
  const seed = seedFromUfvk(ufvk || "demo_seed");
  const rng = xorshift32(seed);
  const start = params.startHeight ?? CONSTANTS.DEFAULT_START_HEIGHT;
  const count = 12 + Math.floor(rng() * 12);
  const now = Math.floor(Date.now() / 1000);

  const pools = ["orchard", "sapling", "transparent"] as const;
  const txs: TxRecord[] = [];

  for (let i = 0; i < count; i++) {
    const hoursAgo = Math.floor(rng() * 720);
    const timestamp = now - hoursAgo * 3600;
    const direction = rng() > 0.5 ? "incoming" : "outgoing";
    const pool = pick(rng, pools);
    const baseAmount = Math.floor(rng() * 8e8) + 2e7; // 0.2 ZEC to ~8.2 ZEC in zats
    const amount = direction === "incoming" ? baseAmount : -baseAmount;

    const tx: TxRecord = {
      txid: randHex(rng, 64),
      height: start + Math.floor(rng() * 500),
      timestamp,
      pool: pool as any,
      amount,
      memo: generateMemo(rng),
      direction: direction as any,
      keyId: `mock_${ufvk?.slice?.(0,6) ?? "anon"}`,
      address: pool === "orchard" ? `u1${randHex(rng, 50)}` : pool === "sapling" ? `zs${randHex(rng, 50)}` : `t1${randHex(rng, 50)}`,
      confirmations: Math.floor(rng() * 500),
      metadata: {
        category: rng() > 0.7 ? "donation" : rng() > 0.5 ? "payment" : undefined
      }
    };

    txs.push(tx);
  }

  // sort newest first
  txs.sort((a, b) => b.timestamp - a.timestamp);

  const notes = txs.map((t, i) => ({
    noteId: `note_${t.txid}_${i}`,
    txid: t.txid,
    position: i,
    value: Math.abs(t.amount),
    memo: t.memo,
    spent: rng() > 0.6,
    spentInTx: rng() > 0.7 ? randHex(rng, 64) : undefined,
  }));

  const lastHeight = start + Math.floor(rng() * 2000);

  return { transactions: txs, notes, lastHeight };
}

/**
 * Stub: placeholder to show how to plug in WASM.
 * Replace the body of `decryptWithUfvk` with the real wasm call, preserving the contract.
 */
export async function decryptWithUfvk(
  ufvk: string,
  params: ScanParams
): Promise<{ transactions: TxRecord[]; notes: ShieldedNote[]; lastHeight: number }> {
  // In production, do:
  // const wasm = await loadZcashWasm(wasmPath);
  // const res = await wasm.decryptCompactBlocks(ufvkBytes, blocksIterator(params));
  // return mapWasmResultToTxRecord(res);

  // For the hackathon demo we return a deterministic mock:
  return decryptWithUfvkMock(ufvk, params);
}