// src/lib/blockchain/mock-blocks.ts
/**
 * Mock compact block generator for offline demos
 *
 * Produces a timeline of compact blocks with few shielded outputs so the
 * scanner and decrypter interfaces can be exercised without a network.
 *
 * Each block contains a small number of transactions; transactions contain
 * mock outputs resembling sapling/orchard commitments.
 */

import type { CompactBlock, CompactTransaction, CompactOutput } from "@/lib/types";
import { CONSTANTS } from "@/lib/types";

/** Lightweight deterministic PRNG (same one used elsewhere) */
function xorshift32(seed: number) {
  let x = seed >>> 0;
  return function () {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xFFFFFFFF;
  };
}

function seedFromString(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function randHex(rng: () => number, len = 64) {
  const hex = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += hex[Math.floor(rng() * hex.length)];
  return out;
}

export function generateMockCompactBlocks(seedString: string, startHeight = CONSTANTS.DEFAULT_START_HEIGHT, count = 50): CompactBlock[] {
  const seed = seedFromString(seedString);
  const rng = xorshift32(seed);
  const blocks: CompactBlock[] = [];

  for (let i = 0; i < count; i++) {
    const height = startHeight + i;
    const header = {
      height,
      hash: randHex(rng, 64),
      timestamp: Math.floor(Date.now() / 1000) - (count - i) * 60,
      version: 4
    };
    const txCount = 1 + Math.floor(rng() * 4);
    const vtx: CompactTransaction[] = [];
    for (let t = 0; t < txCount; t++) {
      const outputsCount = 1 + Math.floor(rng() * 3);
      const outputs: CompactOutput[] = [];
      for (let o = 0; o < outputsCount; o++) {
        outputs.push({
          cmu: randHex(rng, 64),
          epk: randHex(rng, 64),
          ciphertext: randHex(rng, 128).slice(0, 192)
        });
      }
      vtx.push({
        index: t,
        hash: randHex(rng, 64),
        outputs
      });
    }

    blocks.push({ header, vtx });
  }

  return blocks;
}
