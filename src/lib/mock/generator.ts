// src/lib/mock/generator.ts
// HYPER-MOCK 5000™ — FULLY DETERMINISTIC (2025 Final Fixed Version)

import type { MockTransaction, MockNote } from "./types";

// SINGLE SOURCE OF TRUTH RNG — used everywhere
let rng = () => Math.random(); // default fallback

export function setMockSeed(seed: number) {
  const mulberry32 = (a: number) => () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng = mulberry32(seed);
}

// Helper functions using our single rng
function r(min: number, max: number) {
  return min + (max - min) * rng();
}
function ri(min: number, max: number) {
  return Math.floor(r(min, max + 1));
}
function pick<T>(arr: readonly T[]): T {
  return arr[ri(0, arr.length - 1)];
}
function randHash() {
  const hex = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < 64; i++) out += hex[ri(0, hex.length - 1)];
  return out;
}
function zAddr() {
  return "zs1" + randHash().slice(0, 75);
}

function randomPastTimestampSeconds(maxDays = 365, indexBias = 0) {
  const now = Math.floor(Date.now() / 1000);
  const days = ri(0, Math.min(maxDays, Math.max(1, Math.floor(maxDays * 0.9))));
  const intraDay = ri(0, 86400);
  const bias = Math.floor(indexBias * rng());
  return now - (days * 86400 + intraDay + bias);
}

const TAG_BANK = ["airdrop","self-transfer","exchange","cross-chain","refund","donation","salary","vesting","withdrawal","privacy-break","dust-attack","suspected-link","internal-flow","wallet-rotation"];
const MEMO_BANK = ["Coffee","Monthly Salary","Refund — Order #","Payment","Donation","Gift","For services rendered","Subscription Renewal","Internal Transfer","Liquidation","Zcash Test Memo ","Happy Birthday!","Rent Payment","Invoice Payment","Trading profit","Alpha leak avoid pls"];

function shapeRisk(value: number, memo: string | null, pool: "sapling" | "orchard"): number {
  let score = 0;
  if (value < 0.0003) score += 30;
  if (memo && memo.length > 80) score += 20;
  if (value > 3 && pool === "orchard") score += 15;
  score += ri(1, 15);
  return Math.min(95, score);
}

function shapeTags(risk: number): string[] {
  const tags: string[] = [];
  if (risk > 70) tags.push("privacy-break");
  if (risk > 60) tags.push("suspected-link");
  if (risk < 20) tags.push("self-transfer");
  if (rng() > 0.93) tags.push(pick(TAG_BANK));
  if (tags.length === 0 && rng() > 0.85) tags.push(pick(TAG_BANK));
  return [...new Set(tags)];
}

export function generateMockTransactions(count = 50): MockTransaction[] {
  const txs: MockTransaction[] = [];
  const pools = ["sapling", "orchard"] as const;
  const baseHeight = 2_930_000;

  const clusterA = Array.from({ length: 20 }, () => zAddr());
  const clusterB = Array.from({ length: 25 }, () => zAddr());
  const clusterDustAttack = Array.from({ length: 30 }, () => zAddr());

  for (let i = 0; i < count; i++) {
    const height = baseHeight + i;
    const pool = pick(pools);
    const timestamp = randomPastTimestampSeconds(Math.min(365, Math.max(7, Math.floor(count / 2))), i);
    const isIncoming = rng() > 0.43;
    const value = r(0.0001, 7.5);

    let from: string | null = null;
    let to: string | null = null;

    if (isIncoming) {
      from = rng() > 0.6 ? pick(clusterA) : rng() > 0.4 ? pick(clusterB) : pick(clusterDustAttack);
      to = "You";
    } else {
      from = "You";
      to = pick([...clusterA, ...clusterB]);
    }

    const noteCount = ri(1, 3);
    const notes: MockNote[] = [];

    for (let j = 0; j < noteCount; j++) {
      const memo = rng() > 0.77 ? pick(MEMO_BANK) + randHash().slice(0, 6) : null;
      notes.push({
        id: randHash().slice(0, 32),
        value: Number((value / noteCount * r(0.7, 1.3)).toFixed(8)),
        memo,
        isIncoming,
        pool,
      });
    }

    const memoForRisk = notes.find(n => n.memo)?.memo ?? null;
    const risk = shapeRisk(value, memoForRisk, pool);
    const tags = shapeTags(risk);

    txs.push({
      txid: randHash(),
      height,
      timestamp,
      value,
      type: isIncoming ? "incoming" : "outgoing",
      fromAddr: from,
      toAddr: to,
      pool,
      riskScore: risk,
      tags,
      notes,
    });
  }

  return txs.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
}

// Auto-seed from global dataset seed on import
import "./global"; // This triggers setMockSeed(42) from global.ts
