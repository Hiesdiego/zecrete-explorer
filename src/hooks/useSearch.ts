// src/hooks/useSearch.ts
"use client";
import { useEffect, useState } from "react";
import { eventBus } from "@/lib/eventBus";
import type { TxRecord } from "@/lib/types";

export function useSearch(txs: TxRecord[]) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TxRecord[] | null>(null);

  /** listen to global search emitter */
  useEffect(() => {
    const off = eventBus.on("search:query", (q: string) => setQuery(q ?? ""));
    return () => off();
  }, []);

  /** perform filtering */
  useEffect(() => {
    if (!query || query.trim() === "") {
      setResults(null);
      return;
    }

    const q = query.toLowerCase().trim();
    const tokens = q.split(/\s+/).filter(Boolean);

    const filtered = txs.filter((t) => {
      const hay = [
        t.txid,
        t.memo ?? "",
        t.pool,
        t.direction,
        (t.amount / 1e8).toString(),
        new Date(t.timestamp * 1000).toLocaleString(),
        t.height.toString(),
      ]
        .join(" ")
        .toLowerCase();

      return tokens.every((tok) => hay.includes(tok));
    });

    setResults(filtered.slice(0, 1000));
  }, [query, txs]);

  return { query, results };
}
