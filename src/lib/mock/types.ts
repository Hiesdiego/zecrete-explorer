// src/lib/mock/types.ts

export type Pool = "sapling" | "orchard";

/**
 * Pool is usually the literal union "sapling" | "orchard".
 * We allow `Pool | string` so existing code that may produce a broader string
 */

export interface MockNote {
  id: string;
  value: number;
  memo: string | null;
  isIncoming: boolean;
  pool: Pool | string;
}

export interface MockTransaction {
  txid: string;
  height: number;
  timestamp: number;
  value: number;
  type: "incoming" | "outgoing" | "internal";
  fromAddr: string | null;
  toAddr: string | null;
  pool: Pool | string;
  riskScore: number;
  notes: MockNote[];
  tags: string[];
}

export type MockDataset = MockTransaction[];
