"use client";
import React, { createContext, useContext, useEffect,  useState } from "react";
import type { TxRecord } from "@/lib/types";
import { eventBus } from "@/lib/eventBus";
import { assessPrivacy, detectAnomalies } from "@/lib/agent/local-ai";
import { generatePortfolio } from "@/lib/mock/portfolio";
import { useWalletStore } from "@/lib/store/walletStore";
import { getAllUnlockedKeys } from "@/lib/vault";

/** 
 * ExplorerStore — FIXED & HARDENED VERSION (Dec 2025)
 * 
 * Root cause fixed: portfolioLoaded flag was causing state loss on remount.
 * New solution: Use persistent localStorage flag + proper guard logic.
 */

const DEMO_UFVK = "ufvkdemokey1";
const DEMO_LOADED_FLAG = "zecrete:demoPortfolioLoaded";

type ScanProgress = { current?: number; total?: number; percentage?: number; status?: string } | null;

interface ExplorerStore {
  txs: TxRecord[];
  progress: ScanProgress;
  privacySummary: any | null;
  searchQuery: string;
  setSearchQuery(q: string): void;
  startMockScan(opts?: { count?: number }): Promise<void>;
  runPortfolioDemo(opts?: { users?: number; exchanges?: number; attackerClusters?: number; count?: number }): Promise<void>;
  startUltraMode(opts?: { count?: number; batchSize?: number }): Promise<{ cancel(): void } | void>;
  clearData(): void;
}

const ctx = createContext<ExplorerStore | null>(null);

function randHex(len = 64) {
  const hex = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < len; i++) s += hex[Math.floor(Math.random() * hex.length)];
  return s;
}

function genTx(heightBase: number, i: number, keyId = "demo_key"): TxRecord {
  const now = Math.floor(Date.now() / 1000);
  const hoursAgo = Math.floor(Math.random() * 720);
  const timestamp = now - hoursAgo * 3600;
  const direction = Math.random() > 0.5 ? "incoming" : "outgoing";
  const pool = Math.random() > 0.3 ? "orchard" : "sapling";
  const baseAmount = Math.floor(Math.random() * 5e8) + 1e7;
  const amount = direction === "incoming" ? baseAmount : -baseAmount;
  const memos = ["Payment", "Invoice #" + (1000 + Math.floor(Math.random() * 9000)), "Donation", "Refund", "Tip", "", ""];
  return {
    txid: randHex(),
    height: heightBase + i,
    timestamp,
    pool,
    amount,
    memo: Math.random() > 0.3 ? memos[Math.floor(Math.random() * memos.length)] : undefined,
    direction,
    keyId,
  } as TxRecord;
}

export function ExplorerProvider({ children }: { children: React.ReactNode }) {
  

  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [progress, setProgress] = useState<ScanProgress>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [privacySummary, setPrivacySummary] = useState<any | null>(null);
  
  // Persistent flag — survives page reloads and Next.js remounts
  const [isDemoLoaded, setIsDemoLoaded] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DEMO_LOADED_FLAG) === "1";
  });
  
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  const walletStore = useWalletStore;

  // === ON MOUNT: Restore session + auto-load demo if previously loaded ===
  useEffect(() => {
    try {
      const sessions = getAllUnlockedKeys();
      if (sessions.length > 0) {
        const ufvk = sessions[0].ufvk;
        if (ufvk && ufvk.trim() === DEMO_UFVK) {
          walletStore.getState().setUFVK(ufvk, { force: true });
          
          // Only auto-load if we know demo was previously generated and we have no txs yet
          if (isDemoLoaded && txs.length === 0 && !portfolioLoading) {
            console.debug("ExplorerProvider: Auto-reloading demo portfolio on mount");
            runPortfolioDemo().catch(console.warn);
          }
        }
      }
    } catch (e) {
      console.warn("ExplorerProvider: failed to reseed on mount", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once

  // === Search & context broadcast ===
  useEffect(() => {
    const off = eventBus.on("search:query", (q: string) => {
      setSearchQuery(q ?? "");
    });
    return () => off();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      eventBus.emit("explorer:context", { txCount: txs.length, txs: txs.slice(0, 400), privacySummary });
    }, 2000);
    return () => clearInterval(id);
  }, [txs, privacySummary]);

  function computePrivacySummaryLocal(all: TxRecord[]) {
    if (!all.length) return null;
    const scores = all.map((t) => assessPrivacy(t, all).privacyScore);
    const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const highRisk = scores.filter((s) => s < 40).length;
    const recs: string[] = [];
    if (overall < 75) recs.push("Consider avoiding repeated memos and round amounts");
    if (highRisk > 0) recs.push(`${highRisk} high-risk transactions detected`);
    return { overallScore: overall, recommendations: recs, highRisk };
  }

  async function startMockScan(opts?: { count?: number }) {
    const count = opts?.count ?? 200;
    setProgress({ percentage: 0, status: "scanning" });
    const batches = Math.max(4, Math.floor(count / 50));
    const generated: TxRecord[] = [];
    for (let b = 0; b < batches; b++) {
      await new Promise((r) => setTimeout(r, 180));
      const chunk = Array.from({ length: Math.ceil(count / batches) }, (_, i) => genTx(2_850_000 + b * 100, b * 100 + i));
      generated.push(...chunk);
      const percentage = Math.round(((b + 1) / batches) * 100);
      setProgress({ percentage, status: "scanning" });
      setTxs((prev) => {
        const next = [...generated, ...prev].sort((a, b) => b.timestamp - a.timestamp);
        setPrivacySummary(computePrivacySummaryLocal(next));
        return next;
      });
    }
    setProgress({ percentage: 100, status: "complete" });
  }

  async function runPortfolioDemo(opts?: { users?: number; exchanges?: number; attackerClusters?: number; count?: number }) {
    // allow reload if demo flag is set but in-memory txs are empty (remount case)
    if (portfolioLoading) {
      console.debug("runPortfolioDemo: already loading → skip");
      return;
    }
    if (isDemoLoaded && txs.length > 0) {
      console.debug("runPortfolioDemo: demo already loaded in memory → skip");
      return;
    }

    const activeUFVK = walletStore.getState().ufvk?.trim();
    if (!activeUFVK) {
      eventBus.emit("toast", { type: "error", text: "No UFVK active. Import or unlock first." });
      return;
    }

    if (activeUFVK !== DEMO_UFVK) {
      setTxs([]);
      setPrivacySummary(null);
      eventBus.emit("toast", { type: "info", text: "Only ufvkdemokey1 shows demo data in this build." });
      return;
    }

    setPortfolioLoading(true);
    try {
      const { users = 3, exchanges = 1, attackerClusters = 1, count = 120 } = opts ?? {};

      const demo = generatePortfolio({
        users,
        exchanges,
        attackerClusters,
        count,
        seed: activeUFVK, // ← THIS MAKES IT 100% STABLE
      });

      // deterministic timestamp fallback: snapshot now once per run and give stable offsets
      const nowBase = Math.floor(Date.now() / 1000);
      let idxCounter = 0;

      const normalized: TxRecord[] = demo.txs.map((t: any) => {
        let amountSats = 0;
        if (typeof t.amount === "number") amountSats = Math.round(t.amount);
        else if (typeof t.value === "number") amountSats = Math.round(t.value * 1e8);
        else if (typeof t.notes?.[0]?.value === "number") amountSats = Math.round(t.notes[0].value * 1e8);
        else amountSats = Math.round((Math.random() * 2 + 0.01) * 1e8);

        const direction = t.type === "incoming" || t.direction === "incoming" ? "incoming" : "outgoing";

        // deterministic fallback: if timestamp missing, assign nowBase - idx*60 so values are stable for this run
        let timestamp: number;
        if (typeof t.timestamp === "number" && Number.isFinite(t.timestamp)) {
          timestamp = Math.floor(t.timestamp);
        } else if (typeof t.ts === "number" && Number.isFinite(t.ts)) {
          timestamp = Math.floor(t.ts);
        } else {
          timestamp = nowBase - (idxCounter++ * 60); // each missing timestamp 1 minute earlier
        }

        return {
          txid: t.txid ?? `${Math.random().toString(36).slice(2)}_${timestamp}`,
          height: t.height ?? 2_900_000,
          timestamp,
          pool: t.pool ?? "orchard",
          amount: direction === "incoming" ? Math.abs(amountSats) : -Math.abs(amountSats),
          memo: t.notes?.[0]?.memo ?? t.memo,
          direction,
          keyId: (t.fromAddr?.startsWith("you:")) ? "demo_user" : "demo_other",
          raw: t,
        } as TxRecord;
      }).sort((a, b) => b.timestamp - a.timestamp);

      // SUCCESS → persist flag + update state
      setTxs(normalized);
      setPrivacySummary(computePrivacySummaryLocal(normalized));
      setIsDemoLoaded(true);
      setPortfolioLoading(false);

      try {
        localStorage.setItem(DEMO_LOADED_FLAG, "1");
      } catch (e) {}

      eventBus.emit("demo:loaded", { txCount: normalized.length });
      eventBus.emit("toast", { type: "success", text: `Demo portfolio loaded — ${normalized.length} transactions` });
    } catch (e) {
      console.error("runPortfolioDemo failed:", e);
      setPortfolioLoading(false);
      eventBus.emit("toast", { type: "error", text: "Failed to load demo portfolio" });
    }
  }

  async function startUltraMode(opts?: { count?: number; batchSize?: number }) {
    // ... (unchanged, omitted for brevity)
  }

  function clearData() {
    setTxs([]);
    setProgress(null);
    setPrivacySummary(null);
    setIsDemoLoaded(false);
    setPortfolioLoading(false);
    try {
      localStorage.removeItem(DEMO_LOADED_FLAG);
    } catch (e) {}
    eventBus.emit("data:cleared");
  }

  // === AUTO-TRIGGER DEMO WHEN UFVK IS LOADED/UNLOCKED ===
  useEffect(() => {
    const handler = (payload: any) => {
      // payload may come from session:unlocked (now includes ufvk) or wallet:loaded
      const ufvk = (payload?.ufvk ?? walletStore.getState().ufvk ?? "").trim();

      if (!ufvk || ufvk !== DEMO_UFVK) {
        // Non-demo key → just clear
        if (txs.length > 0) {
          setTxs([]);
          setPrivacySummary(null);
        }
        return;
      }

      // Demo key detected
      // If we have no in-memory txs and not currently loading, attempt to (re)load demo.
      // Use a microtask to let any synchronous walletStore updates settle first.
      if (txs.length === 0 && !portfolioLoading) {
        // small delay to allow walletStore.setUFVK to settle (if it was just called)
        setTimeout(() => {
          try {
            // re-check active UFVK from store to be safe
            const active = walletStore.getState().ufvk?.trim();
            if (active === DEMO_UFVK) {
              console.debug("Event-triggered demo load (handler)");
              runPortfolioDemo().catch(console.warn);
            } else {
              console.debug("Event-triggered demo load skipped — walletStore ufvk not settled yet");
            }
          } catch (e) {
            console.warn("Event handler failed during demo load attempt", e);
          }
        }, 0);
      }
    };

    eventBus.on("wallet:loaded", handler);
    eventBus.on("session:unlocked", handler);
    eventBus.on("vault:key-unlocked", handler);

    return () => {
      eventBus.off("wallet:loaded", handler);
      eventBus.off("session:unlocked", handler);
      eventBus.off("vault:key-unlocked", handler);
    };
  }, [isDemoLoaded, portfolioLoading, txs.length]);

  const value: ExplorerStore = {
    txs,
    progress,
    privacySummary,
    searchQuery,
    setSearchQuery,
    startMockScan,
    runPortfolioDemo,
    startUltraMode,
    clearData,
  };

  return <ctx.Provider value={value}>{children}</ctx.Provider>;
}

export function useExplorer() {
  const v = useContext(ctx);
  if (!v) throw new Error("useExplorer must be used inside ExplorerProvider");
  return v;
}
