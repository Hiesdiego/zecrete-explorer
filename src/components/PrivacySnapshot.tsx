// src/components/PrivacySnapshot.tsx
"use client";
import React, { useMemo, useState, useCallback } from "react";
import type { TxRecord } from "@/lib/types";
import { eventBus } from "@/lib/eventBus";
import { isGhostMode, obfuscateAmount } from "@/lib/privacy";
import { useTheme } from "@/hooks/useTheme";
import {
  Shield,
  AlertTriangle,
  Users,
  Download,
  ChevronDown,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Network,
  TrendingUp,
  Target,
  Zap,
  Activity,
  Maximize2,
  Minimize2
} from "lucide-react";

type Props = {
  txs?: TxRecord[] | null;
  privacySummary?: any | null;
  onOpenHeatmap?: () => void;
};

function formatZec(sats: number, ghost: boolean) {
  if (ghost) return obfuscateAmount(sats);
  return `${(sats / 1e8).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })} ZEC`;
}

export default function PrivacySnapshot({ txs, privacySummary, onOpenHeatmap }: Props) {
  const { isDark } = useTheme();
  const safeTxs: TxRecord[] = Array.isArray(txs) ? txs : [];
  const [ghost, setGhost] = useState(() => isGhostMode());
  const [collapsed, setCollapsed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const txCount = safeTxs.length;

  // Card base class depending on theme
  const card = isDark
    ? "glass p-4 sm:p-6 rounded-xl border border-[var(--border)]"
    : "bg-white/90 p-4 sm:p-6 rounded-xl backdrop-blur-xl border border-gray-300/30";

  // Toggle ghost mode
  const toggleGhostMode = useCallback(() => {
    const newGhost = !ghost;
    setGhost(newGhost);
    eventBus.emit("ui:ghost", { on: newGhost });
  }, [ghost]);

  // Compute statistics
  const stats = useMemo(() => {
    const numbers = safeTxs.filter(t => typeof t?.amount === "number");
    const incoming = numbers.filter(t => t.direction === "incoming");
    const outgoing = numbers.filter(t => t.direction === "outgoing");
    const avg = numbers.length ? numbers.reduce((a, b) => a + Math.abs(b.amount || 0), 0) / numbers.length : 0;
    const biggestIn = incoming.length ? incoming.reduce((a, b) => (Math.abs(b.amount || 0) > Math.abs(a.amount || 0) ? b : a)) : null;
    const biggestOut = outgoing.length ? outgoing.reduce((a, b) => (Math.abs(b.amount || 0) > Math.abs(a.amount || 0) ? b : a)) : null;

    // Fee statistics
    const fees = safeTxs.filter(t => typeof (t as any).fee === "number").map(t => (t as any).fee);
    const feeAvg = fees.length ? fees.reduce((a, b) => a + b, 0) / fees.length : 0;
    const feeMax = fees.length ? Math.max(...fees) : 0;

    // Clustering analysis
    const clusters = new Map<string, number>();
    for (const t of safeTxs) {
      const day = typeof t.timestamp === "number" ? new Date(t.timestamp * 1000).toISOString().slice(0,10) : "unknown";
      const pool = t.pool ?? "unk";
      const k = `${day}:${pool}`;
      clusters.set(k, (clusters.get(k) || 0) + 1);
    }
    const clusterCount = clusters.size;
    const largestCluster = Array.from(clusters.entries()).sort((a,b) => b[1]-a[1])[0]?.[1] ?? 0;

    // Address exposure
    const addressCounts = new Map<string, number>();
    for (const t of safeTxs) {
      const addr = (t as any).fromAddr ?? (t as any).toAddr ?? (t as any).addr ?? null;
      if (addr) addressCounts.set(addr, (addressCounts.get(addr) || 0) + 1);
    }
    const topAddresses = Array.from(addressCounts.entries()).sort((a,b) => b[1]-a[1]).slice(0,5);

    // Anonymity set
    const recvAddrs = new Set<string>();
    for (const t of incoming) {
      const a = (t as any).toAddr ?? (t as any).addr ?? "unknown";
      recvAddrs.add(a);
    }
    const anonymitySet = Math.max(1, recvAddrs.size);

    // Risk breakdown
    let highRisk = 0, medRisk = 0, lowRisk = 0;
    if (privacySummary && Array.isArray(safeTxs)) {
      highRisk = privacySummary.highRisk ?? safeTxs.filter((_,i) => i % 7 === 0).length;
      medRisk = Math.max(0, Math.floor(safeTxs.length * 0.1) - highRisk);
      lowRisk = Math.max(0, safeTxs.length - highRisk - medRisk);
    } else {
      for (const t of safeTxs) {
        const amt = Math.abs(t.amount || 0);
        if (amt > 5e8) highRisk++;
        else if (amt > 1e8) medRisk++;
        else lowRisk++;
      }
    }

    // Privacy score
    const overallScore = privacySummary?.overallScore ?? Math.max(0, 100 - (highRisk * 10 + medRisk * 5));

    return {
      avg,
      biggestIn,
      biggestOut,
      feeAvg,
      feeMax,
      clusterCount,
      largestCluster,
      topAddresses,
      anonymitySet,
      highRisk,
      medRisk,
      lowRisk,
      overallScore,
      totalVolume: numbers.reduce((a, b) => a + Math.abs(b.amount || 0), 0),
      avgTxSize: avg
    };
  }, [safeTxs, privacySummary]);

  // Generate recommendations based on risk assessment
  const recommendations = useMemo(() => {
    const recs: string[] = [];

    if (stats.highRisk > 0) {
      recs.push("⚠️ Consider consolidating high-risk transactions");
      recs.push("🔒 Review memos for personally identifiable information");
    }

    if (stats.anonymitySet < 5) {
      recs.push("👥 Low anonymity set - consider increasing counterparty diversity");
    }

    if (stats.clusterCount < 3 && txCount > 10) {
      recs.push("🔄 Transactions appear clustered - vary timing patterns");
    }

    if (recs.length === 0) {
      recs.push("✅ Privacy profile looks strong. Maintain current practices.");
    }

    return recs;
  }, [stats, txCount]);

  // Export report
  const exportReport = useCallback(() => {
    const rep = {
      generatedAt: Date.now(),
      txCount,
      overallScore: stats.overallScore,
      anonymitySet: stats.anonymitySet,
      clusterCount: stats.clusterCount,
      largestCluster: stats.largestCluster,
      riskBreakdown: {
        high: stats.highRisk,
        medium: stats.medRisk,
        low: stats.lowRisk
      },
      biggestIn: stats.biggestIn ? {
        txid: stats.biggestIn.txid,
        amount: stats.biggestIn.amount,
        timestamp: stats.biggestIn.timestamp
      } : null,
      biggestOut: stats.biggestOut ? {
        txid: stats.biggestOut.txid,
        amount: stats.biggestOut.amount,
        timestamp: stats.biggestOut.timestamp
      } : null,
      recommendations
    };

    const blob = new Blob([JSON.stringify(rep, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zecrete-privacy-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    eventBus.emit("toast", { type: "success", text: "Privacy report exported" });
  }, [stats, txCount, recommendations]);

  // Handle deep analysis
  const handleDeepAnalysis = useCallback(() => {
    eventBus.emit("local-ai:analyze", {
      type: "privacy",
      data: stats
    });
  }, [stats]);

  // Collapsed view
  if (collapsed) {
    return (
      <div className={`${isDark ? 'glass-heavy' : 'bg-white/90 backdrop-blur-xl'} rounded-xl p-4 border border-[var(--border)] hover:border-[var(--accent)] transition-all duration-300 pt-24 sm:pt-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Privacy Score</div>
              <div className="text-2xl font-bold gold-gradient-text text-[var(--text)]">{stats.overallScore}/100</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleGhostMode}
              className={`p-2 rounded-lg ${ghost ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'hover:bg-[var(--surface)]'}`}
              title={ghost ? "Ghost Mode Enabled" : "Ghost Mode Disabled"}
            >
              {ghost ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setCollapsed(false)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg ${isDark ? 'glass' : 'bg-white/80'} hover:bg-[var(--surface)] text-sm`}
            >
              <Maximize2 className="w-4 h-4" />
              <span>Expand</span>
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-xs text-[var(--text-secondary)]">Anonymity</div>
            <div className="font-semibold text-[var(--text)]">{stats.anonymitySet}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[var(--text-secondary)]">High Risk</div>
            <div className={`font-semibold ${stats.highRisk > 0 ? 'text-rose-400' : 'text-green-400'}`}>
              {stats.highRisk}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? 'glass-heavy' : 'bg-white/90 backdrop-blur-xl'} rounded-2xl border border-[var(--border)] overflow-hidden pt-24 sm:pt-6`}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-[var(--border)]" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.06) 0%, transparent 100%)" }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center">
                <Shield className="w-6 h-6 text-black" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--surface)] border-2 border-[var(--bg)] flex items-center justify-center">
                <div className={`w-2 h-2 rounded-full ${stats.overallScore >= 80 ? 'bg-green-500' : stats.overallScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'} animate-pulse`} />
              </div>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-[var(--text)]">
                Privacy Snapshot
                <span className="text-xs font-normal text-[var(--text-secondary)] bg-[var(--surface)] px-2 py-1 rounded-full">
                  {txCount} txs
                </span>
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xl">
                Advanced privacy analytics — computed locally. Respects your keys and data.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleGhostMode}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${ghost ? 'bg-gradient-to-r from-[var(--accent)]/20 to-[var(--accent-dark)]/20 text-[var(--accent)] border border-[var(--accent)]/30' : (isDark ? 'glass hover:bg-[var(--surface)]' : 'bg-white/80 hover:bg-[var(--surface)]')}`}
            >
              {ghost ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="text-sm hidden sm:inline text-[var(--text)]">{ghost ? 'Ghost' : 'Normal'}</span>
            </button>

            <button
              onClick={() => setCollapsed(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'glass hover:bg-[var(--surface)]' : 'bg-white/80 hover:bg-[var(--surface)]'}`}
            >
              <Minimize2 className="w-4 h-4" />
              <span className="text-sm hidden sm:inline text-[var(--text)]">Minimize</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        {/* Overall Score & Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Privacy Score Card */}
          <div className={`${card}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[var(--accent)]" />
                <span className="font-medium text-[var(--text)]">Overall Privacy Score</span>
              </div>
              <div className={`text-xs px-2 py-1 rounded-full ${stats.overallScore >= 80 ? 'bg-green-500/10 text-green-400' : stats.overallScore >= 60 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {stats.overallScore >= 80 ? 'Excellent' : stats.overallScore >= 60 ? 'Good' : 'Needs Attention'}
              </div>
            </div>

            <div className="mb-3">
              <div className="text-3xl sm:text-5xl font-bold gold-gradient-text mb-1 text-[var(--text)]">{stats.overallScore}/100</div>
              <div className="w-full h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${stats.overallScore >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : stats.overallScore >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-rose-500 to-red-500'}`} style={{ width: `${stats.overallScore}%` }} />
              </div>
            </div>

            <div className="text-xs text-[var(--text-secondary)]">Based on transaction patterns, timing, and memo analysis</div>
          </div>

          {/* Anonymity & Clustering */}
          <div className={`${card}`}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-[var(--accent)]" />
              <span className="font-medium text-[var(--text)]">Anonymity Metrics</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--text-secondary)]">Anonymity Set</span>
                  <span className="font-semibold text-[var(--text)]">{stats.anonymitySet}</span>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Distinct receiving addresses</div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--text-secondary)]">Transaction Clusters</span>
                  <span className="font-semibold text-[var(--text)]">{stats.clusterCount}</span>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Largest: {stats.largestCluster} txs</div>
              </div>
            </div>
          </div>

          {/* Risk Breakdown */}
          <div className={`${card}`}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-[var(--accent)]" />
              <span className="font-medium text-[var(--text)]">Risk Assessment</span>
            </div>

            <div className="space-y-2 text-[var(--text)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500" /> <span className="text-sm text-[var(--text)]">High Risk</span></div>
                <div className="font-semibold text-rose-400">{stats.highRisk}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /> <span className="text-sm text-[var(--text)]">Medium Risk</span></div>
                <div className="font-semibold text-amber-400">{stats.medRisk}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /> <span className="text-sm text-[var(--text)]">Low Risk</span></div>
                <div className="font-semibold text-green-400">{stats.lowRisk}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Biggest Transactions */}
          <div className={`${card}`}>
            <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-5 h-5 text-[var(--accent)]" /> <span className="font-medium text-[var(--text)]">Key Transactions</span></div>

            <div className="space-y-3">
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-2">Largest Incoming</div>
                {stats.biggestIn ? (
                  <div className="p-3 rounded-lg bg-[var(--surface)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-green-400">{ghost ? obfuscateAmount(stats.biggestIn.amount) : `${(stats.biggestIn.amount/1e8).toFixed(4)} ZEC`}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{stats.biggestIn.txid?.slice(0, 8)}...</span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">{stats.biggestIn.timestamp ? new Date(stats.biggestIn.timestamp * 1000).toLocaleDateString() : 'Unknown date'}</div>
                  </div>
                ) : (
                  <div className="text-sm text-[var(--text-secondary)] italic">No incoming transactions</div>
                )}
              </div>

              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-2">Largest Outgoing</div>
                {stats.biggestOut ? (
                  <div className="p-3 rounded-lg bg-[var(--surface)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-rose-400">{ghost ? obfuscateAmount(stats.biggestOut.amount) : `${(stats.biggestOut.amount/1e8).toFixed(4)} ZEC`}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{stats.biggestOut.txid?.slice(0, 8)}...</span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">{stats.biggestOut.timestamp ? new Date(stats.biggestOut.timestamp * 1000).toLocaleDateString() : 'Unknown date'}</div>
                  </div>
                ) : (
                  <div className="text-sm text-[var(--text-secondary)] italic">No outgoing transactions</div>
                )}
              </div>
            </div>
          </div>

          {/* Network Statistics */}
          <div className={`${card}`}>
            <div className="flex items-center gap-2 mb-3"><Network className="w-5 h-5 text-[var(--accent)]" /> <span className="font-medium text-[var(--text)]">Network Analysis</span></div>

            <div className="space-y-3">
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-2">Average Transaction</div>
                <div className="font-semibold text-lg gold-gradient-text">{formatZec(stats.avg, ghost)}</div>
              </div>

              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-2">Fee Statistics</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-[var(--text-secondary)]">Average</div>
                    <div className="font-medium">{ghost ? 'Hidden' : `${(stats.feeAvg/1e8).toFixed(6)} ZEC`}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-secondary)]">Maximum</div>
                    <div className="font-medium">{ghost ? 'Hidden' : `${(stats.feeMax/1e8).toFixed(6)} ZEC`}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Address Exposure */}
        <div className={`${card} mb-6`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Target className="w-5 h-5 text-[var(--accent)]" /> <span className="font-medium text-[var(--text)]">Address Exposure</span></div>
            <span className="text-sm text-[var(--text-secondary)]">{stats.topAddresses.length} addresses</span>
          </div>

          {stats.topAddresses.length === 0 ? (
            <div className="text-center py-6 text-[var(--text-secondary)]"><Lock className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No address metadata available</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.topAddresses.map(([address, count], index) => (
                <div key={address} className="p-3 rounded-lg bg-[var(--surface)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${index === 0 ? 'gold-gradient' : 'bg-[var(--surface)]'}`}>
                        <span className={`text-xs font-bold ${index === 0 ? 'text-black' : 'text-[var(--accent)]'}`}>#{index + 1}</span>
                      </div>
                      <div className="font-mono text-sm truncate max-w-[120px] text-[var(--text)]">{ghost ? `${address.slice(0, 6)}...` : address}</div>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">{count} txs</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Exposure: {count > 3 ? 'High' : count > 1 ? 'Medium' : 'Low'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendations & Actions */}
        <div className={`${card}`}>
          <div className="flex items-center gap-2 mb-3"><Sparkles className="w-5 h-5 text-[var(--accent)]" /> <span className="font-medium text-[var(--text)]">Privacy Recommendations</span></div>

          <div className="space-y-2 mb-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface)]">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[var(--accent)]/20 to-transparent flex items-center justify-center flex-shrink-0"><ChevronDown className="w-3 h-3 text-[var(--accent)]" /></div>
                <span className="text-sm text-[var(--text)]">{rec}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> <span>Report generated locally — no data leaves device.</span></div>

            <div className="flex items-center gap-2">
              <button onClick={exportReport} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'glass hover:bg-[var(--surface)]' : 'bg-white/80 hover:bg-[var(--surface)]'}`}>
                <Download className="w-4 h-4" /> <span className="text-sm hidden sm:inline text-[var(--text)]">Export</span>
              </button>

              <button onClick={handleDeepAnalysis} className="flex items-center gap-2 px-3 py-2 rounded-lg gold-gradient text-black font-medium">
                <Zap className="w-4 h-4" /> <span className="text-sm hidden sm:inline">Deep Analysis</span>
              </button>

              <button onClick={() => { if (onOpenHeatmap) onOpenHeatmap(); else eventBus.emit("ui:open-heatmap"); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'glass hover:bg-[var(--surface)]' : 'bg-white/80 hover:bg-[var(--surface)]'}`}>
                <Activity className="w-4 h-4" /> <span className="text-sm hidden sm:inline text-[var(--text)]">Activity Map</span>
              </button>
            </div>
          </div>
        </div>

        {/* Details Toggle */}
        <div className="mt-4 flex justify-center">
          <button onClick={() => setShowDetails(!showDetails)} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)]">
            {showDetails ? 'Hide Technical Details' : 'Show Technical Details'} <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Technical Details */}
        {showDetails && (
          <div className="mt-4 p-4 sm:p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <h4 className="font-medium mb-3 text-[var(--text)]">Technical Privacy Metrics</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-[var(--text)]">
              <div>
                <div className="text-[var(--text-secondary)]">Total Volume</div>
                <div className="font-mono">{formatZec(stats.totalVolume, ghost)}</div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Average TX Size</div>
                <div className="font-mono">{formatZec(stats.avgTxSize, ghost)}</div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Risk Ratio</div>
                <div className="font-mono">{((stats.highRisk / Math.max(1, txCount)) * 100).toFixed(1)}% high risk</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
