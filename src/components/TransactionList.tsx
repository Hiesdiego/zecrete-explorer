'use client';
import React, { useEffect, useMemo, useState } from "react";
import type { TxRecord } from "@/lib/types";
import {
  obfuscateMemo,
  isGhostMode,
  enableGhostMode,
  disableGhostMode,
  obfuscateAmount
} from "@/lib/privacy";
import { useExplorer } from "@/context/ExplorerStore";
import { useSearch } from "@/hooks/useSearch";
import { eventBus } from "@/lib/eventBus";
import {
  Filter,
  Download,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Calendar,
  Hash,
  Shield,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Search,
  Clock,
  TrendingUp,
  BarChart3
} from "lucide-react";

interface ExtendedTxRecord extends TxRecord {
  fee?: number;
}

type Props = { transactions?: TxRecord[] | null };

export function TransactionList({ transactions }: Props) {
  const explorer = (() => {
    try {
      return useExplorer();
    } catch {
      return null;
    }
  })();

  const inputTxs = (transactions ?? explorer?.txs ?? []) as ExtendedTxRecord[];
  const { results } = useSearch(inputTxs);
  const display = results ?? inputTxs;

  // Ghost mode reactive
  const [ghost, setGhost] = useState<boolean>(() => {
    try { return isGhostMode(); } catch { return false; }
  });
  useEffect(() => {
    setGhost(isGhostMode());
    const off = eventBus.on("ui:ghost", (p: any) => setGhost(Boolean(p?.on ?? p)));
    return () => off();
  }, []);

  // detect mobile
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth <= 768); }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // UI controls
  const [compact, setCompact] = useState(false);
  const [directionFilter, setDirectionFilter] = useState<"all" | "incoming" | "outgoing">("all");
  const [poolFilter, setPoolFilter] = useState<string>("all");
  const [minAmountZec, setMinAmountZec] = useState<string>("");
  const [maxAmountZec, setMaxAmountZec] = useState<string>("");
  const [onlyHighRisk, setOnlyHighRisk] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "amount" | "privacy">("date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(isMobile ? 5 : 10);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);

  // adapt perPage if device changes
  useEffect(() => {
    setPerPage(isMobile ? 5 : 10);
  }, [isMobile]);

  // Reset page when results change
  useEffect(() => setPage(1), [results, directionFilter, poolFilter, minAmountZec, maxAmountZec, onlyHighRisk, sortBy, sortDir, perPage]);

  const safeNumber = (n: any) => (Number.isFinite(n) ? n : 0);
  const zecToSats = (z: number) => Math.round(z * 1e8);
  const satsToZec = (s: number) => (s / 1e8);

  // filter + sort pipeline
  const filtered = useMemo(() => {
    let arr = (display || []).slice() as ExtendedTxRecord[];

    // direction filter
    if (directionFilter !== "all") arr = arr.filter(t => t.direction === directionFilter);

    // pool filter
    if (poolFilter !== "all") arr = arr.filter(t => String(t.pool || "unknown") === poolFilter);

    // amount range filter
    const minSat = minAmountZec ? zecToSats(Number(minAmountZec) || 0) : null;
    const maxSat = maxAmountZec ? zecToSats(Number(maxAmountZec) || 0) : null;
    if (minSat !== null) arr = arr.filter(t => Math.abs(t.amount || 0) >= minSat);
    if (maxSat !== null) arr = arr.filter(t => Math.abs(t.amount || 0) <= maxSat);

    // high-risk filter
    if (onlyHighRisk) arr = arr.filter(t => t.risk && typeof t.risk.privacyScore === "number" && t.risk.privacyScore < 40);

    // sort
    arr.sort((a, b) => {
      if (sortBy === "date") {
        const ta = safeNumber(a.timestamp || 0);
        const tb = safeNumber(b.timestamp || 0);
        return sortDir === "desc" ? tb - ta : ta - tb;
      }
      if (sortBy === "amount") {
        const aa = Math.abs(safeNumber(a.amount || 0));
        const bb = Math.abs(safeNumber(b.amount || 0));
        return sortDir === "desc" ? bb - aa : aa - bb;
      }
      if (sortBy === "privacy") {
        const pa = safeNumber(a.risk?.privacyScore ?? 100);
        const pb = safeNumber(b.risk?.privacyScore ?? 100);
        return sortDir === "desc" ? pa - pb : pb - pa;
      }
      return 0;
    });

    return arr;
  }, [display, directionFilter, poolFilter, minAmountZec, maxAmountZec, onlyHighRisk, sortBy, sortDir]);

  // formatted dates
  const formattedDates = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of filtered) {
      const key = t.txid ?? `${t.height ?? "h"}_${t.timestamp ?? "0"}`;
      const tsNum = (typeof t.timestamp === "number") ? Math.floor(t.timestamp) : (Number(t.timestamp) || 0);
      m[key] = tsNum ? new Date(tsNum * 1000).toLocaleString() : "—";
    }
    return m;
  }, [filtered]);

  // paging
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  // pools list for filter dropdown
  const pools = useMemo(() => {
    const s = new Set<string>();
    for (const t of display) s.add(String(t.pool || "unknown"));
    return ["all", ...Array.from(s).sort()];
  }, [display]);

  // summary stats
  const stats = useMemo(() => {
    const count = filtered.length;
    const totalSats = filtered.reduce((a, b) => a + Math.abs(b.amount || 0), 0);
    const avgSats = count ? Math.round(totalSats / count) : 0;
    const totalFees = filtered.reduce((a, b) => a + Math.abs(b.fee || 0), 0);
    const incoming = filtered.filter(t => t.direction === "incoming").reduce((a, b) => a + Math.abs(b.amount || 0), 0);
    const outgoing = filtered.filter(t => t.direction === "outgoing").reduce((a, b) => a + Math.abs(b.amount || 0), 0);
    const highRisk = filtered.filter(t => t.risk && typeof t.risk.privacyScore === "number" && t.risk.privacyScore < 40).length;
    return {
      count,
      totalZec: satsToZec(totalSats),
      avgZec: satsToZec(avgSats),
      totalFeesZec: satsToZec(totalFees),
      incomingZec: satsToZec(incoming),
      outgoingZec: satsToZec(outgoing),
      highRisk
    };
  }, [filtered]);

  // selection utilities
  function toggleSelect(txid: string) {
    setSelected(s => ({ ...s, [txid]: !s[txid] }));
  }
  function selectAllOnPage() {
    const next = { ...selected };
    for (const t of pageData) next[t.txid] = true;
    setSelected(next);
  }
  function clearSelection() {
    setSelected({});
  }
  function exportSelectedCSV() {
    const rows: string[][] = [["txid", "timestamp_iso", "direction", "amount_sats", "amount_zec", "memo", "pool", "fee_sats", "privacyScore"]];
    const ids = Object.keys(selected).filter(k => selected[k]);
    const toExport = ids.length ? inputTxs.filter(t => ids.includes(t.txid)) : pageData;
    for (const t of toExport) {
      const iso = typeof t.timestamp === "number" ? new Date(t.timestamp * 1000).toISOString() : "";
      rows.push([
        t.txid || "",
        iso,
        t.direction || "",
        String(t.amount || 0),
        (satsToZec(Math.abs(t.amount || 0))).toFixed(8),
        String(t.memo || "").replace(/\n/g, " "),
        String(t.pool || ""),
        String(t.fee ?? ""),
        String(t.risk?.privacyScore ?? "")
      ]);
    }
    const csv = rows.map(r => r.map(c => {
      const s = String(c ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
      return s;
    }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // row actions
  function copyTxid(txid?: string) {
    if (!txid) return;
    try {
      navigator.clipboard.writeText(txid);
      eventBus.emit("toast", { type: "success", text: "Transaction ID copied" });
    } catch {
      eventBus.emit("toast", { type: "error", text: "Failed to copy" });
    }
  }
  function focusTx(txid?: string) {
    if (!txid) return;
    try { eventBus.emit("tx:focus", { txid }); } catch {}
  }

  // ghost toggle
  function toggleGhostFromButton() {
    if (isGhostMode()) {
      disableGhostMode();
      try { eventBus.emit("ui:ghost", { on: false }); } catch {}
      setGhost(false);
    } else {
      enableGhostMode();
      try { eventBus.emit("ui:ghost", { on: true }); } catch {}
      setGhost(true);
    }
  }

  // formatting helpers
  function formatAmountSats(n: number) {
    if (ghost) return obfuscateAmount(n);
    return `${satsToZec(Math.abs(n)).toFixed(6)} ZEC`;
  }
  function formatAmountZecFromSats(n: number) {
    if (ghost) return obfuscateAmount(n);
    return `${satsToZec(Math.abs(n)).toFixed(6)} ZEC`;
  }

  // Clear all filters
  const clearFilters = () => {
    setDirectionFilter("all");
    setPoolFilter("all");
    setMinAmountZec("");
    setMaxAmountZec("");
    setOnlyHighRisk(false);
    setShowFilters(false);
  };

  return (
    <div className={`space-y-6 pt-6 ${isMobile ? 'px-4' : 'px-0'}`}>
      {/* Header Stats */}
      <div className="glass rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
              <FileText className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold">Shielded Transactions</h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Locally decrypted and analyzed</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={toggleGhostFromButton}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                ghost
                  ? 'bg-gradient-to-r from-[var(--accent)]/20 to-[var(--accent-dark)]/20 text-[var(--accent)] border border-[var(--accent)]/30'
                  : 'glass hover:bg-[var(--surface)]'
              }`}
              title="Toggle Ghost Mode"
            >
              {ghost ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">{ghost ? "Ghost Mode" : "Normal Mode"}</span>
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-[var(--surface)] text-sm"
              aria-expanded={showFilters}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>

            <button
              onClick={() => setCompact(!compact)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-[var(--surface)] text-sm"
            >
              {compact ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              <span className="hidden sm:inline">{compact ? "Expand" : "Compact"}</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1 text-xs text-[var(--text-secondary)]">
              <Hash className="w-4 h-4 text-[var(--accent)]" />
              Total Transactions
            </div>
            <div className="text-xl font-bold">{stats.count}</div>
          </div>

          <div className="glass p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1 text-xs text-[var(--text-secondary)]">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Total Volume
            </div>
            <div className="text-xl font-bold gold-gradient-text">{ghost ? obfuscateAmount(Math.round(stats.totalZec * 1e8)) : `${stats.totalZec.toFixed(4)} ZEC`}</div>
          </div>

          <div className="glass p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1 text-xs text-[var(--text-secondary)]">
              <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
              Avg Transaction
            </div>
            <div className="text-xl font-bold">{ghost ? obfuscateAmount(Math.round(stats.avgZec * 1e8)) : `${stats.avgZec.toFixed(4)} ZEC`}</div>
          </div>

          <div className="glass p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1 text-xs text-[var(--text-secondary)]">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              High Risk
            </div>
            <div className={`text-xl font-bold ${stats.highRisk > 0 ? 'text-amber-400' : 'text-green-400'}`}>{stats.highRisk}</div>
          </div>
        </div>
      </div>

      {/* Filters Panel - collapsible on mobile */}
      {showFilters && (
        <div className={`glass rounded-xl p-4 sm:p-6 ${isMobile ? 'fixed left-4 right-4 top-20 z-50 shadow-xl' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Filter className="w-4 h-4" /> Filter Transactions</h3>
            <button onClick={() => setShowFilters(false)} className="text-sm text-[var(--text-secondary)]">Close</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Direction</label>
              <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value as any)} className="w-full p-2 rounded-lg glass border border-[var(--border)]">
                <option value="all">All Directions</option>
                <option value="incoming">Incoming Only</option>
                <option value="outgoing">Outgoing Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Pool</label>
              <select value={poolFilter} onChange={(e) => setPoolFilter(e.target.value)} className="w-full p-2 rounded-lg glass border border-[var(--border)]">
                {pools.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Min Amount (ZEC)</label>
              <input type="number" placeholder="0.0" value={minAmountZec} onChange={(e) => setMinAmountZec(e.target.value)} className="w-full p-2 rounded-lg glass border border-[var(--border)]" step="0.00000001" />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Max Amount (ZEC)</label>
              <input type="number" placeholder="Any" value={maxAmountZec} onChange={(e) => setMaxAmountZec(e.target.value)} className="w-full p-2 rounded-lg glass border border-[var(--border)]" step="0.00000001" />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={onlyHighRisk} onChange={(e) => setOnlyHighRisk(e.target.checked)} className="w-4 h-4 rounded border-[var(--border)] bg-[var(--surface)]" />
              Show only high-risk transactions
            </label>

            <div className="ml-auto flex items-center gap-2">
              <div className="text-sm text-[var(--text-secondary)] hidden sm:inline">Sort by</div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="p-2 rounded-lg glass border border-[var(--border)] text-sm">
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="privacy">Privacy Score</option>
              </select>

              <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")} className="p-2 rounded-lg glass border border-[var(--border)]">
                {sortDir === "desc" ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>

              <button onClick={clearFilters} className="px-3 py-1.5 rounded-lg gold-gradient text-black text-sm">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--text-secondary)]">Showing {pageData.length} of {filtered.length} transactions{filtered.length !== display.length && ` (filtered from ${display.length})`}</div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={selectAllOnPage} className="px-3 py-1.5 rounded-lg glass text-sm">Select page</button>
          <button onClick={clearSelection} className="px-3 py-1.5 rounded-lg glass text-sm">Clear selection</button>
          <button onClick={exportSelectedCSV} className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-sm"><Download className="w-3 h-3" /> <span className="hidden sm:inline">Export CSV</span></button>
        </div>
      </div>

      {/* Transaction List */}
      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-[var(--text-secondary)] opacity-30" />
          <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
          <p className="text-[var(--text-secondary)] mb-4 max-w-md mx-auto">Try adjusting your filters or import more transaction data.</p>
          <button onClick={clearFilters} className="gold-gradient px-4 py-2 rounded-lg text-black text-sm">Clear All Filters</button>
        </div>
      ) : (
        <div className="space-y-3">
          {pageData.map(tx => {
            const txid = tx.txid;
            const isSelected = Boolean(selected[txid]);
            const isExpanded = Boolean(expanded[txid]);
            const privacyScore = tx.risk?.privacyScore ?? null;
            const displayDate = formattedDates[txid] ?? "—";
            const isIncoming = tx.direction === "incoming";

            return (
              <div key={txid} className={`glass rounded-xl overflow-hidden transition-all duration-300 ${isSelected ? 'ring-2 ring-[var(--accent)]' : ''}`}>
                {/* Transaction Header */}
                <div className="p-3 sm:p-4">
                  <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3`}> 
                    {/* left column - controls/icon */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(txid)} className="w-4 h-4 rounded border-[var(--border)] bg-[var(--surface)]" />

                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isIncoming ? 'bg-gradient-to-br from-green-500/20 to-green-500/10' : 'bg-gradient-to-br from-red-500/20 to-red-500/10'}`}>
                        {isIncoming ? <ArrowDownRight className="w-5 h-5 text-green-400" /> : <ArrowUpRight className="w-5 h-5 text-red-400" />}
                      </div>
                    </div>

                    {/* main content */}
                    <div className="flex-1 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                          <span className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${isIncoming ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{ghost ? '•••' : tx.direction}</span>

                          <button onClick={() => copyTxid(txid)} className="text-xs font-mono text-[var(--text)] hover:text-[var(--accent)] transition-colors truncate" title="Copy Transaction ID">
                            {ghost ? '••••••••' : `${txid?.slice(0, 10)}...${txid?.slice(-6)}`}
                          </button>

                          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                            <Calendar className="w-3 h-3" />
                            <span>{ghost ? '••/••/••' : displayDate}</span>
                          </div>
                        </div>

                        <div className="text-lg sm:text-xl font-bold ml-auto">
                          {ghost ? <div className="w-24 h-5 bg-[var(--surface)] rounded animate-pulse" /> : (<>{isIncoming ? '+' : '−'}{satsToZec(Math.abs(tx.amount)).toFixed(6)} ZEC</>)}
                        </div>
                      </div>

                      {/* details row */}
                      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-[var(--text-secondary)]">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                          <span>Pool:</span>
                          <span className="font-medium text-[var(--text)]">{ghost ? '•••' : tx.pool}</span>
                        </div>

                        {privacyScore !== null && (
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-[var(--text-secondary)]" />
                            <span>Privacy:</span>
                            <span className={`font-medium ${privacyScore > 80 ? 'text-green-400' : privacyScore > 60 ? 'text-amber-400' : 'text-red-400'}`}>{ghost ? '••' : `${privacyScore}/100`}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
                          <span>Block:</span>
                          <span className="font-medium">{ghost ? '••••' : tx.height || '—'}</span>
                        </div>

                        {tx.fee && (
                          <div className="flex items-center gap-2">
                            <span>Fee:</span>
                            <span className="font-medium">{ghost ? obfuscateAmount(tx.fee) : `${satsToZec(tx.fee).toFixed(6)} ZEC`}</span>
                          </div>
                        )}
                      </div>

                      {/* Memo preview (hidden on tiny screens unless expanded) */}
                      {tx.memo && (!isMobile || (isMobile && isExpanded)) && (
                        <div className="mt-3 p-3 rounded-lg bg-[var(--surface)] text-sm">
                          <div className="text-xs text-[var(--text-secondary)] mb-1">Memo</div>
                          <div className="line-clamp-3 whitespace-pre-wrap">{ghost ? (<div className="space-y-1"><div className="w-full h-3 bg-[var(--surface)]/50 rounded" /><div className="w-2/3 h-3 bg-[var(--surface)]/50 rounded" /></div>) : obfuscateMemo(tx.memo)}</div>
                        </div>
                      )}

                      {/* actions */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <button onClick={() => focusTx(txid)} className="px-3 py-1.5 rounded-lg glass text-sm flex items-center gap-2"><Eye className="w-4 h-4" /><span className="hidden sm:inline">Focus</span></button>
                        <button onClick={() => setExpanded(e => ({ ...e, [txid]: !e[txid] }))} className="px-3 py-1.5 rounded-lg glass text-sm flex items-center gap-2">{isExpanded ? 'Collapse' : 'Expand'} {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                        <button onClick={() => copyTxid(txid)} className="px-3 py-1.5 rounded-lg glass text-sm flex items-center gap-2"><Copy className="w-4 h-4" /><span className="hidden sm:inline">Copy ID</span></button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)] p-4 bg-[var(--surface)]/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Transaction Details</h4>
                        <div className="space-y-2 text-sm">
                          <div><div className="text-xs text-[var(--text-secondary)]">Transaction ID</div><div className="font-mono break-all">{txid}</div></div>
                          <div><div className="text-xs text-[var(--text-secondary)]">Timestamp</div><div>{new Date((tx.timestamp || 0) * 1000).toLocaleString()}</div></div>
                          <div><div className="text-xs text-[var(--text-secondary)]">Amount</div><div className="font-medium">{formatAmountZecFromSats(tx.amount ?? 0)}</div></div>
                          <div><div className="text-xs text-[var(--text-secondary)]">Fee</div><div>{tx.fee ? (ghost ? obfuscateAmount(tx.fee) : `${satsToZec(tx.fee).toFixed(6)} ZEC`) : '—'}</div></div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Privacy Analysis</h4>
                        <div className="space-y-2 text-sm">
                          <div><div className="text-xs text-[var(--text-secondary)]">Pool</div><div>{tx.pool}</div></div>
                          <div><div className="text-xs text-[var(--text-secondary)]">Privacy Score</div>
                            <div className="flex items-center gap-2"><div className="flex-1 h-2 bg-[var(--surface)] rounded-full overflow-hidden"><div className={`h-full ${(tx.risk?.privacyScore ?? 100) > 80 ? 'bg-green-500' : (tx.risk?.privacyScore ?? 100) > 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${tx.risk?.privacyScore ?? 100}%` }} /></div><div className="text-sm font-medium">{tx.risk?.privacyScore ?? '—'}/100</div></div>
                          </div>
                          <div><div className="text-xs text-[var(--text-secondary)]">Full Memo</div><div className="text-sm whitespace-pre-wrap bg-[var(--surface)] p-3 rounded-lg">{ghost ? (<div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="w-full h-3 bg-[var(--surface)]/50 rounded" />)}</div>) : (tx.memo || '—')}</div></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 gap-2 flex-wrap">
              <div className="text-sm text-[var(--text-secondary)]">Page {page} of {totalPages}</div>

              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg glass disabled:opacity-30">Previous</button>

                {/* compact numeric control only on md+ */}
                <div className="hidden md:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-10 h-10 rounded-lg ${page === pageNum ? 'gold-gradient text-black font-semibold' : 'glass'}`}>{pageNum}</button>
                    );
                  })}
                </div>

                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg glass disabled:opacity-30">Next</button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">Show</span>
                <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="p-2 rounded-lg glass border border-[var(--border)] text-sm">
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TransactionList;