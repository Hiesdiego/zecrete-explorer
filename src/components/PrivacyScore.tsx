// src/components/PrivacyScore.tsx
"use client";
import React from "react";
import type { TxRecord } from "@/lib/types";

export function PrivacyScore({ txs }: { txs: TxRecord[] }) {
  const avg = Math.round(txs.reduce((a, t) => a + (t.risk?.privacyScore ?? 70), 0) / Math.max(1, txs.length));
  const color = avg > 80 ? "text-green-400" : avg > 60 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="glass p-6 rounded-xl">
      <h3 className="text-xl font-bold mb-2">Shielded Privacy Score</h3>
      <p className={`text-4xl font-extrabold ${color}`}>{avg}/100</p>
      <p className="text-sm text-gray-400 mt-1">Computed locally via heuristics (memo risk, timing, dust).</p>
    </div>
  );
}
