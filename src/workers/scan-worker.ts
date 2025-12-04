// src/workers/scan-worker.ts
// This file is built as a module worker. It runs entirely isolated from main thread.
// The worker emits progress events and a final mock ScanResult compatible with your types.
// A mock worker is used here for demo purposes; replace with real scanning logic as needed.


type MessageIn = { type: string; ufvk?: string; params?: any };

function randHex(len: number) {
  const hex = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += hex[Math.floor(Math.random() * hex.length)];
  return out;
}

function generateMockTx(keyId: string, heightBase: number) {
  const now = Math.floor(Date.now() / 1000);
  const direction = Math.random() > 0.5 ? "incoming" : "outgoing";
  const pool = Math.random() > 0.4 ? "orchard" : "sapling";
  const baseAmount = Math.floor(Math.random() * 5e8) + 2e7;
  const amount = direction === "incoming" ? baseAmount : -baseAmount;
  return {
    txid: randHex(64),
    height: heightBase + Math.floor(Math.random() * 50),
    timestamp: now - Math.floor(Math.random() * 60 * 60 * 24 * 20),
    pool,
    amount,
    memo: Math.random() > 0.6 ? "Invoice #" + Math.floor(Math.random() * 9999) : undefined,
    direction,
    keyId,
    address: pool === "orchard" ? `u1${randHex(54)}` : `zs1${randHex(54)}`,
    confirmations: Math.floor(Math.random() * 100)
  };
}

self.onmessage = async (ev: MessageEvent<MessageIn>) => {
  const { type, ufvk, params } = ev.data;
  if (type !== "scan") return;
  try {
    const start = params?.startHeight ?? 2850000;
    const total = 100;
    for (let i = 0; i <= total; i += 4) {
      await new Promise(r => setTimeout(r, 40));
      self.postMessage({ type: "progress", progress: {
        current: start + Math.floor((i/100) * 1000),
        total: start + 1000,
        percentage: i,
        status: i < 100 ? "scanning" : "decrypting"
      }});
    }

    const txs = [];
    const keyId = `demo_${ufvk ? ufvk.slice(0,6) : "anon"}`;
    for (let j = 0; j < 12; j++) txs.push(generateMockTx(keyId, start));
    const result = {
      transactions: txs,
      notes: txs.map((t,i)=>({
        noteId: `note_${t.txid}_${i}`,
        txid: t.txid,
        position: i,
        value: Math.abs(t.amount),
        memo: t.memo,
        spent: Math.random() > 0.7
      })),
      lastHeight: start + 1000,
      errors: []
    };

    self.postMessage({ type: "done", result });
  } catch (err:any) {
    self.postMessage({ type: "error", error: err?.message || String(err) });
  }
};
export {};
