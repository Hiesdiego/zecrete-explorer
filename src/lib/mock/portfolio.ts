// src/lib/mock/portfolio.ts
// 100% DETERMINISTIC — FINAL FIXED VERSION

import { GLOBAL_MOCK_DATASET } from "./global";
import { getMockWalletForUFVK } from "./ufvkSampler";
import { generateMockTransactions as baseGenerate, setMockSeed } from "./generator";
import type { MockTransaction } from "./types";

const DEMO_UFVK = "ufvkdemokey1";

function stringToSeed(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generatePortfolio(opts: {
  users?: number;
  exchanges?: number;
  attackerClusters?: number;
  count?: number;
  seed?: string;
} = {}) {
  const { users = 3, exchanges = 1, attackerClusters = 1, count = 120, seed = DEMO_UFVK } = opts;

  // CRITICAL: Seed the global generator using the UFVK
  setMockSeed(stringToSeed(seed));

  const rng = mulberry32(stringToSeed(seed));
  const rnd = () => rng();
  const ri = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
  const pick = <T>(arr: T[]) => arr[ri(0, arr.length - 1)];

  const txs: MockTransaction[] = [];

  const usersList = Array.from({ length: users }, (_, i) => ({
    id: `user_${i + 1}`,
    ufvk: `ufvk_user_${seed}_u${i + 1}`,
    address: `you:${i + 1}`,
  }));
  const exchangesList = Array.from({ length: exchanges }, (_, i) => ({
    id: `exchange_${i + 1}`,
    ufvk: `ufvk_ex_${seed}_e${i + 1}`,
    address: `exchange:${i + 1}`,
  }));
  const attackers = Array.from({ length: attackerClusters }, (_, a) => ({
    id: `att_${a + 1}`,
    ufvk: `ufvk_att_${seed}_a${a + 1}`,
    addresses: Array.from({ length: 6 }, () => `zs1${rnd().toString(36).slice(2, 30)}`),
  }));

  const perWalletTarget = Math.max(5, Math.floor(count / Math.max(1, users + exchanges)));

  const pushWalletTxs = (ufvk: string, target: number) => {
    const wallet = getMockWalletForUFVK(ufvk, GLOBAL_MOCK_DATASET);
    const walletTxs = wallet.txs ?? [];
    for (let i = 0; i < walletTxs.length && txs.length < count && i < target; i++) {
      const w = walletTxs[i];
      txs.push({ ...w, txid: w.txid ?? `${ufvk}_tx_${i}` } as MockTransaction);
    }
  };

  usersList.forEach(u => pushWalletTxs(u.ufvk, perWalletTarget));
  exchangesList.forEach(e => pushWalletTxs(e.ufvk, perWalletTarget * 2));
  attackers.forEach(a => pushWalletTxs(a.ufvk, 15));

  // NOW SAFE — baseGenerate is seeded!
  if (txs.length < count) {
    txs.push(...baseGenerate(count - txs.length));
  }

  txs.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

  return {
    txs: txs.slice(0, count),
    wallets: { users: usersList, exchanges: exchangesList, attackers },
  };
}