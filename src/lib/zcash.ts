// src/lib/zcash.ts
import { getMockTransactions } from "./mock-data";

export type ZecreteTx = {
  txid: string;
  height: number;
  timestamp: number;
  amount: number;
  memo: string;
  direction: "incoming" | "outgoing";
};

// Simulate a sync process (progress callback)
export async function fakeSync(onProgress: (p: number) => void) {
  for (let i = 0; i <= 100; i += 6) {
    await new Promise((r) => setTimeout(r, 80));
    onProgress(Math.min(100, i));
  }
  return true;
}

export async function decryptAllTransactions(ufvk: string): Promise<ZecreteTx[]> {
  // In a real app we'd use UFVK to decrypt shielded outputs.
  // For the demo, return the mock transactions and pretend we decrypted them with ufvk.
  const txs = getMockTransactions();
  // Optionally "filter" transactions to ones related to ufvk (demo: keep all).
  return txs.sort((a, b) => b.height - a.height);
}
