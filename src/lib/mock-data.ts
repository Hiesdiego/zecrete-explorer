// src/lib/mock-data.ts
import { ZecreteTx } from "./zcash";

const now = Math.floor(Date.now() / 1000);

function randHex64() {
  return new Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}
function randomAmount(isIncoming: boolean) {
  const base = Math.floor(Math.random() * (isIncoming ? 20 : 10) + 1);
  return (isIncoming ? 1 : -1) * base * 100_000_000;
}

const baseTxs: ZecreteTx[] = [
  { txid: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2", height: 2854938, timestamp: now - 300, amount: 250_000_000, memo: "Payment for design work", direction: "incoming" },
  { txid: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3", height: 2854937, timestamp: now - 600, amount: 180_000_000, memo: "Coffee run reimbursement", direction: "incoming" },
  { txid: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4", height: 2854935, timestamp: now - 1800, amount: -120_000_000, memo: "Sent to Bob", direction: "outgoing" },
  { txid: "d4e5f6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5", height: 2854930, timestamp: now - 7200, amount: 750_000_000, memo: "Hackathon prize!", direction: "incoming" },
  // more...
];

const extra: ZecreteTx[] = [];
for (let i = 0; i < 27; i++) {
  const isIncoming = Math.random() > 0.4;
  extra.push({
    txid: randHex64(),
    height: 2_853_000 + i,
    timestamp: now - (i + 10) * 86_400 - Math.floor(Math.random() * 3_600),
    amount: randomAmount(isIncoming),
    memo: isIncoming ? ["Payment received", "Thanks!", "Invoice settled", "Tip", "Refund"][Math.floor(Math.random() * 5)] : ["Sent", "Payment", "Transfer", "Donation"][Math.floor(Math.random() * 4)],
    direction: isIncoming ? "incoming" : "outgoing",
  });
}

export const MOCK_TRANSACTIONS = [...baseTxs, ...extra];

export const getMockTransactions = () => MOCK_TRANSACTIONS;
