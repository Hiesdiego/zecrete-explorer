// src/hooks/useUltraScan.ts
"use client";
/**
 * useUltraScan
 *
 * - Mock-only UltraScan (walletStore-backed)
 * - No attempts to import wasm/webzjs or any external scanner libraries.
 *
 * NOTES:
 * - Mock path uses useWalletStore.getState().setUFVK(ufvk) so the same
 *   deterministic dataset is shared across Explorer / Portfolio / UltraScan.
 * - To switch to real scanning later:
 *   * Restore a real client init path here that imports/initializes your
 *     WASM/WebZJS scanner (but keep it behind dynamic import guards).
 *   * Replace the MOCK PATH with calls that fetch+decrypt compact blocks
 *     and produce TxRecord[] compatible with the rest of the app.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { TxRecord } from "@/lib/types";
import { getAllUnlockedKeys, getUnlockedKey } from "@/lib/vault";
import { eventBus } from "@/lib/eventBus";
import { assessTransactionRisk } from "@/lib/risk";

// Use the walletStore so ultrascan uses the same deterministic mock data
import { useWalletStore } from "@/lib/store/walletStore";

type UltraScanState =
  | "idle"
  | "initializing"
  | "scanning"
  | "decrypting"
  | "analyzing"
  | "complete"
  | "error"
  | "cancelled";

export interface UltraScanResult {
  transactions: TxRecord[];
  notes?: any[];
  addresses?: Record<string, string>;
  balances?: { orchard?: number; sapling?: number; combined?: number };
  privacyReport?: any;
  lastHeight?: number;
}

export function useUltraScan() {
  const [state, setState] = useState<UltraScanState>("idle");
  const [progress, setProgress] = useState<{ percentage: number; status: string; current?: number; total?: number } | null>(null);
  const [result, setResult] = useState<UltraScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const clientRef = useRef<any>(null); // mock client only

  // -----------------------
  // initClient (mock-only)
  // -----------------------
  const initClient = useCallback(async () => {
    if (clientRef.current) return clientRef.current;

    setState("initializing");
    // Directly use mock scanner — NO dynamic imports, NO wasm/webzjs.
    clientRef.current = { type: "mock", impl: createMockScanner() };
    return clientRef.current;
  }, []);

  function createMockScanner() {
    // Minimal deterministic mock object with small API surface.
    return {
      async deriveBirthday(ufvk: string) {
        // pseudo deterministic birthday derived from ufvk length/hash
        return Math.max(2_600_000, 2_850_000 - (ufvk.length % 10000));
      },
      async fetchCompactBlocks(_from: number, _to: number, onProgress?: (p: number) => void) {
        const total = Math.max(1, Math.min(500, (_to - _from) / 10));
        for (let i = 0; i <= total; i++) {
          await new Promise((r) => setTimeout(r, 20));
          onProgress?.(Math.round((i / total) * 100));
        }
        return []; // mock returns nothing here
      },
      // kept for compatibility; actual txs are pulled from walletStore by start()
      async scanWithUFVK(_ufvk: string, opts: any, onProgress?: (p: number) => void) {
        for (let i = 0; i <= 100; i += 10) {
          await new Promise((r) => setTimeout(r, 20));
          onProgress?.(i);
        }
        const count = opts?.count ?? 200;
        return { txs: [], lastHeight: 2_850_000 + count };
      },
    };
  }

  // Cancel current scan
  const cancel = useCallback(() => {
    try {
      controllerRef.current?.abort();
    } catch {}
    controllerRef.current = null;
    setState((prev) => (prev === "complete" ? prev : "cancelled"));
    setProgress(null);
    eventBus.emit("ultrascan:cancel");
  }, []);

  // Main start function
  const start = useCallback(
    async (opts?: {
      ufvk?: string; // if provided, use directly. Otherwise try unlocked keys.
      keyId?: string; // optional keyId to use (will attempt getUnlockedKey)
      // network/server params purposely omitted (mock-only)
      startHeight?: number;
      endHeight?: number;
      batchSize?: number;
      count?: number; // for mock generator / limit
    }) => {
      setError(null);
      setResult(null);
      setProgress({ percentage: 0, status: "initializing" });
      setState("initializing");
      controllerRef.current = new AbortController();
      const signal = controllerRef.current.signal;

      try {
        // resolve UFVK: prefer explicit ufvk, then unlocked key via vault
        let ufvk = opts?.ufvk ?? null;
        if (!ufvk && opts?.keyId) {
          ufvk = getUnlockedKey(opts.keyId) ?? null;
        }
        if (!ufvk) {
          // if no key specified, use first unlocked
          const unlocked = getAllUnlockedKeys();
          if (unlocked.length > 0) ufvk = unlocked[0].ufvk;
        }
        if (!ufvk) {
          throw new Error("No unlocked UFVK found. Unlock a viewing key before running UltraScan.");
        }

        // initialize mock client (no external libs)
        const client = await initClient();
        if (!client) throw new Error("Scanner client initialization failed.");

        // Derive birthday (mock)
        setProgress({ percentage: 2, status: "deriving birthday" });
        setState("initializing");

        const birthdayHeight = await client.impl.deriveBirthday(ufvk);

        if (signal.aborted) throw new Error("Scan aborted");

        // Set ranges (mock-only; retained for UI)
        const startH = Math.max(1, opts?.startHeight ?? birthdayHeight ?? 2_850_000);
        const endH = opts?.endHeight ?? startH + (opts?.count ?? 5000);
        setProgress({ percentage: 6, status: `scanning from ${startH} → ${endH}`, current: startH, total: endH });

        // scanning
        setState("scanning");
        let scanTxs: TxRecord[] = [];
        let lastHeight = startH;

        // ------------------------------
        // MOCK PATH (walletStore-backed)
        // ------------------------------
        setProgress({ percentage: 20, status: "loading deterministic wallet from store" });

        // Populate the walletStore deterministically for this UFVK.
        // setUFVK is synchronous in walletStore implementation and will derive txs/balance.
        try {
          useWalletStore.getState().setUFVK(ufvk);
        } catch (e) {
          console.warn("walletStore.setUFVK failed (non-fatal for mock):", e);
        }

        // Read derived wallet data
        const walletState = useWalletStore.getState();
        const allTxs = walletState.txs ?? [];

        // Respect opts.count if provided; default small for UltraScan demo
        const limit = Math.min(allTxs.length, opts?.count ?? Math.max(20, allTxs.length));
        scanTxs = allTxs.slice(0, limit).map((tx: any) => {
          // Convert MockTransaction -> TxRecord shape if necessary.
          return {
            txid: tx.txid,
            height: tx.height ?? 2_850_000,
            timestamp: tx.timestamp ?? Math.floor(Date.now() / 1000),
            pool: tx.pool ?? "orchard",
            amount: typeof tx.amount === "number" ? tx.amount : Math.round((tx.value ?? 0) * 1e8),
            memo: tx.memo ?? (tx.notes?.[0]?.memo),
            direction: tx.type === "incoming" || tx.direction === "incoming" ? "incoming" : "outgoing",
            keyId: "ultra:mock",
            ...tx,
          } as TxRecord;
        });

        lastHeight = startH + scanTxs.length;

        // Simulate progress for UI feel
        for (let p = 20; p <= 60; p += 8) {
          if (signal.aborted) throw new Error("Scan aborted");
          setProgress({ percentage: p, status: `processing mock data (${p}%)` });
          // small pause for UI feel
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 40));
        }

        if (signal.aborted) throw new Error("Scan aborted");

        setState("decrypting");
        setProgress({ percentage: 86, status: "running privacy analysis" });

        // Compute balances & basic report
        const balances = { orchard: 0, sapling: 0, combined: 0 };
        for (const t of scanTxs) {
          if (t.pool === "orchard") balances.orchard = (balances.orchard ?? 0) + (t.amount ?? 0);
          if (t.pool === "sapling") balances.sapling = (balances.sapling ?? 0) + (t.amount ?? 0);
        }
        balances.combined = (balances.orchard ?? 0) + (balances.sapling ?? 0);

        // Per-transaction risk enrichment
        const txsWithRisk = scanTxs.map((tx) => ({
          ...tx,
          risk: assessTransactionRisk(tx, scanTxs),
        }));

        // privacy summary
        const privacyScores = txsWithRisk.map((t) => t.risk?.privacyScore ?? 70);
        const overall = Math.round(privacyScores.reduce((a, b) => a + b, 0) / Math.max(1, privacyScores.length));
        const privacyReport = {
          overallScore: overall,
          txCount: txsWithRisk.length,
          sampleHighRisk: txsWithRisk.filter((t) => (t.risk?.privacyScore ?? 100) < 50).slice(0, 6).map((t) => t.txid),
        };

        setState("analyzing");
        setProgress({ percentage: 95, status: "finalizing report" });

        const final: UltraScanResult = {
          transactions: txsWithRisk.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
          balances,
          addresses: {},
          privacyReport,
          lastHeight,
        };

        setResult(final);
        setState("complete");
        setProgress({ percentage: 100, status: "complete", current: lastHeight, total: lastHeight });
        eventBus.emit("ultrascan:complete", final);
        return final;
      } catch (e: any) {
        console.error("UltraScan error:", e);
        if (e?.name === "AbortError") {
          setState("cancelled");
          setProgress(null);
          setError("Scan cancelled");
        } else {
          setState("error");
          setError(String(e?.message ?? e ?? "Unknown scan error"));
        }
        eventBus.emit("ultrascan:error", { message: String(e) });
        throw e;
      }
    },
    [initClient]
  );

  // convenience: start using a currently unlocked key if none given
  const startWithFirstUnlocked = useCallback((opts?: any) => {
    const unlocked = getAllUnlockedKeys();
    if (!unlocked.length) {
      setError("No unlocked keys. Unlock a UFVK in the Vault first.");
      throw new Error("No unlocked keys");
    }
    // pass keyId so the start() resolver can obtain the plaintext via getUnlockedKey
    return start({ ...opts, keyId: unlocked[0].keyId });
  }, [start]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        controllerRef.current?.abort();
      } catch {}
      controllerRef.current = null;
    };
  }, []);

  return {
    start,
    startWithFirstUnlocked,
    cancel,
    state,
    progress,
    result,
    error,
  };
}
