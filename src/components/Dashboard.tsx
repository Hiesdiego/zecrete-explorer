'use client';
import React, { useMemo, useEffect, useState, useCallback } from "react";
import type { TxRecord } from "@/lib/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { usePrice } from "@/context/PriceProvider";
import { isGhostMode, obfuscateAmount } from "@/lib/privacy";
import { eventBus } from "@/lib/eventBus";
import { 
  Download, 
  Minimize2, 
  Maximize2, 
  Calendar, 
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  ChevronDown,
  ChevronUp
} from "lucide-react";

type Props = {
  transactions?: TxRecord[] | null;
  price?: { usd?: number } | null;
};

const RANGE_PRESETS: { key: string; days?: number; label: string }[] = [
  { key: "7d", days: 7, label: "7 Days" },
  { key: "30d", days: 30, label: "30 Days" },
  { key: "90d", days: 90, label: "90 Days" },
  { key: "all", days: undefined, label: "All Time" },
];

export function Dashboard({ transactions, price: priceProp }: Props) {
  const txs: TxRecord[] = Array.isArray(transactions) ? transactions : [];
  const ctx = usePrice();
  const price = priceProp ?? ctx.price;

  // Ghost Mode
  const [ghost, setGhost] = useState<boolean>(() => {
    try { return isGhostMode(); } catch { return false; }
  });
  useEffect(() => {
    setGhost(isGhostMode());
    const off = eventBus.on("ui:ghost", (p: any) => setGhost(Boolean(p?.on ?? p)));
    return () => off();
  }, []);

  // UI state
  const [rangeKey, setRangeKey] = useState<string>("30d");
  const [currency, setCurrency] = useState<"ZEC" | "USD">("ZEC");
  const [topCount, setTopCount] = useState<number>(5);
  const [sortTopBy, setSortTopBy] = useState<"abs" | "time">("abs");
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [expandedView, setExpandedView] = useState<string | null>(null);

  // convenient helpers
  const safeNumber = (n: number) => (Number.isFinite(n) ? n : 0);
  const nowSec = Math.floor(Date.now() / 1000);

  // filter txs by range selection
  const filteredTxs = useMemo(() => {
    const preset = RANGE_PRESETS.find(r => r.key === rangeKey);
    if (!preset || !preset.days) return txs.slice();
    const cutoff = nowSec - preset.days * 86400;
    return txs.filter(t => typeof t?.timestamp === "number" && t.timestamp >= cutoff);
  }, [txs, rangeKey, nowSec]);

  // compute totals
  const computeTotalsFor = useCallback((list: TxRecord[]) => {
    const rec = list
      .filter((t) => t?.direction === "incoming")
      .reduce((a, b) => a + (b?.amount ?? 0), 0);
    const sent = Math.abs(
      list
        .filter((t) => t?.direction === "outgoing")
        .reduce((a, b) => a + (b?.amount ?? 0), 0)
    );
    const bal = rec - sent;
    return { rec, sent, bal };
  }, []);

  const totals = useMemo(() => computeTotalsFor(filteredTxs), [filteredTxs, computeTotalsFor]);

  // percent change
  const prevTotals = useMemo(() => {
    const preset = RANGE_PRESETS.find(r => r.key === rangeKey);
    if (!preset || !preset.days) return { rec: 0, sent: 0, bal: 0 };
    const days = preset.days!;
    const end = nowSec;
    const start = end - days * 86400;
    const prevStart = start - days * 86400;
    const prevEnd = start - 1;
    const prev = txs.filter(t => typeof t?.timestamp === "number" && t.timestamp >= prevStart && t.timestamp <= prevEnd);
    return computeTotalsFor(prev);
  }, [txs, rangeKey, nowSec, computeTotalsFor]);

  const percentChange = useMemo(() => {
    const curr = safeNumber(totals.bal);
    const prev = safeNumber(prevTotals.bal);
    if (prev === 0 && curr === 0) return 0;
    if (prev === 0) return Infinity;
    return ((curr - prev) / Math.abs(prev)) * 100;
  }, [totals, prevTotals]);

  // USD conversion
  const balanceZec = useMemo(() => totals.bal / 1e8, [totals]);
  const balanceUSD = useMemo(() => {
    if (!price || typeof price?.usd !== "number") return null;
    return balanceZec * price.usd;
  }, [price, balanceZec]);

  // Area chart data
  const volume = useMemo(() => {
    const valid = filteredTxs.filter((t) => typeof t?.timestamp === "number");
    const map: Record<string, number> = {};
    for (const t of valid) {
      const ts = t.timestamp as number;
      const key = new Date(ts * 1000).toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + Math.abs((t?.amount ?? 0) / 1e8);
    }
    return Object.keys(map)
      .map((k) => ({ date: k, amt: map[k] }))
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((x) => ({ 
        dateLabel: new Date(x.date + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" }), 
        ...x 
      }));
  }, [filteredTxs]);

  // Net flow data
  const netFlow = useMemo(() => {
    const valid = filteredTxs.filter((t) => typeof t?.timestamp === "number");
    const map: Record<string, number> = {};
    for (const t of valid) {
      const ts = t.timestamp as number;
      const key = new Date(ts * 1000).toISOString().slice(0, 10);
      const amtZec = (t.amount ?? 0) / 1e8;
      map[key] = (map[key] || 0) + amtZec;
    }
    return Object.keys(map)
      .map((k) => ({ date: k, net: map[k] }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((x) => ({ 
        dateLabel: new Date(x.date + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" }), 
        ...x 
      }))
      .slice(-14);
  }, [filteredTxs]);

  const pie = useMemo(() => ([
    { name: "Received", value: safeNumber(totals.rec / 1e8), color: "#10b981" },
    { name: "Sent", value: safeNumber(totals.sent / 1e8), color: "#ef4444" }
  ]), [totals]);

  // Top transactions
  const topTxs = useMemo(() => {
    return filteredTxs
      .filter(t => typeof t?.amount === "number")
      .slice()
      .sort((a, b) => {
        if (sortTopBy === "time") return (b.timestamp || 0) - (a.timestamp || 0);
        return Math.abs((b.amount || 0)) - Math.abs((a.amount || 0));
      })
      .slice(0, topCount);
  }, [filteredTxs, topCount, sortTopBy]);

  // CSV export functions
  function downloadCSV(filename: string, rows: string[][]) {
    const csv = rows.map(r => r.map(c => {
      const v = (c === null || c === undefined) ? "" : String(c);
      if (v.includes('"') || v.includes(',') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportVolumeCSV() {
    const rows = [["date", "amount_zec"]];
    for (const v of volume) {
      rows.push([v.date, (v.amt || 0).toFixed(8)]);
    }
    downloadCSV(`volume_${rangeKey}.csv`, rows);
  }

  function exportTxsCSV() {
    const rows = [["timestamp_iso", "direction", "amount_sats", "amount_zec", "memo", "txid"]];
    for (const t of filteredTxs) {
      const d = typeof t.timestamp === "number" ? new Date(t.timestamp * 1000).toISOString() : "";
      rows.push([d, t.direction || "", String(t.amount || 0), ((t.amount || 0) / 1e8).toFixed(8), t.memo || "", t.txid || ""]);
    }
    downloadCSV(`txs_${rangeKey}.csv`, rows);
  }

  // formatting helpers
  function formatZecAmount(sats: number) {
    if (ghost) return obfuscateAmount(sats);
    return `${(sats / 1e8).toFixed(4)} ZEC`;
  }

  function formatUSD(sats: number | null | undefined) {
    if (!price || typeof price.usd !== "number") return null;
    const z = (sats ?? 0) / 1e8;
    return `$${(z * price.usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Custom Tooltips
  function AreaTooltip({ active, payload, label }: any) {
    if (!active || !payload || payload.length === 0) return null;
    const v = payload[0].value ?? 0;
    const display = currency === "ZEC" 
      ? (ghost ? obfuscateAmount(v * 1e8) : `${Number(v || 0).toFixed(4)} ZEC`)
      : (ghost ? "Hidden" : `$${(Number(v || 0) * (price?.usd ?? 0)).toFixed(2)}`);
    return (
      <div className="glass p-3 rounded-xl border border-[var(--border)] shadow-lg">
        <div className="text-xs text-[var(--text-secondary)]">{label}</div>
        <div className="font-semibold text-[var(--accent)]">{display}</div>
      </div>
    );
  }

  function PieTooltip({ active, payload }: any) {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0];
    const v = p?.value ?? 0;
    const display = currency === "ZEC" 
      ? (ghost ? obfuscateAmount(v * 1e8) : `${Number(v || 0).toFixed(4)} ZEC`)
      : (ghost ? "Hidden" : `$${(Number(v || 0) * (price?.usd ?? 0)).toFixed(2)}`);
    return (
      <div className="glass p-3 rounded-xl border border-[var(--border)] shadow-lg">
        <div className="font-semibold">{p?.name}</div>
        <div className="text-sm text-[var(--text-secondary)]">{display}</div>
      </div>
    );
  }

  const pctChangeDisplay = (() => {
    if (!isFinite(percentChange)) return "—";
    if (percentChange === Infinity) return "New";
    const sign = percentChange > 0 ? "+" : "";
    return `${sign}${percentChange.toFixed(1)}%`;
  })();

  // Collapsed view
  if (collapsed) {
    return (
      <div className="glass p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-transparent flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Portfolio Balance</div>
              <div className="text-lg font-bold gold-gradient-text">
                {currency === "ZEC" 
                  ? (ghost ? obfuscateAmount(totals.bal) : `${(safeNumber(totals.bal / 1e8)).toFixed(4)} ZEC`)
                  : (ghost ? "Hidden" : (balanceUSD !== null ? `$${balanceUSD.toLocaleString()}` : "—"))
                }
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-24 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={netFlow}>
                  <Line 
                    type="monotone" 
                    dataKey="net" 
                    stroke="url(#netGradient)" 
                    strokeWidth={2} 
                    dot={false}
                  />
                  <defs>
                    <linearGradient id="netGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--accent)" />
                      <stop offset="100%" stopColor="var(--accent-dark)" />
                    </linearGradient>
                  </defs>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <button 
              onClick={() => setCollapsed(false)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg glass hover:bg-[var(--surface)] transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="text-sm">Expand</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Range buttons - horizontally scrollable on tiny screens */}
        <div className="overflow-x-auto w-full sm:w-auto">
          <div className="inline-flex gap-2 px-1 py-1">
            {RANGE_PRESETS.map(r => (
              <button
                key={r.key}
                onClick={() => setRangeKey(r.key)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap text-sm ${
                  rangeKey === r.key 
                    ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] text-black font-medium' 
                    : 'glass hover:bg-[var(--surface)]'
                }`}
              >
                <Calendar className="w-3 h-3" />
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 glass px-2 py-1 rounded-lg text-sm">
            <span className="text-sm text-[var(--text-secondary)]">Currency</span>
            <button 
              onClick={() => setCurrency("ZEC")}
              className={`ml-2 px-2 py-1 rounded text-sm ${currency === "ZEC" ? 'bg-[var(--accent)] text-black' : 'hover:bg-[var(--surface)]'}`}
            >
              ZEC
            </button>
            <button 
              onClick={() => setCurrency("USD")}
              className={`px-2 py-1 rounded text-sm ${currency === "USD" ? 'bg-[var(--accent)] text-black' : 'hover:bg-[var(--surface)]'}`}
            >
              USD
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={exportVolumeCSV}
              className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-[var(--surface)] transition-colors text-sm"
            >
              <Download className="w-3 h-3" />
              <span className="hidden xs:inline">Volume CSV</span>
            </button>

            <button 
              onClick={exportTxsCSV}
              className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-[var(--surface)] transition-colors text-sm"
            >
              <Download className="w-3 h-3" />
              <span className="hidden xs:inline">TXs CSV</span>
            </button>

            <button 
              onClick={() => setCollapsed(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-[var(--surface)] transition-colors text-sm"
            >
              <Minimize2 className="w-3 h-3" />
              <span className="hidden xs:inline">Minimize</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <div className="glass p-4 md:p-6 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Balance ({rangeKey})</div>
              <div className="text-xl md:text-2xl font-bold mt-1">
                {currency === "ZEC" 
                  ? (ghost ? obfuscateAmount(totals.bal) : `${(safeNumber(totals.bal / 1e8)).toFixed(4)} ZEC`)
                  : (ghost ? "Hidden" : (balanceUSD !== null ? `$${balanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"))
                }
              </div>
            </div>
            <TrendingUp className={`w-7 h-7 ${
              percentChange > 0 ? 'text-green-400' : percentChange < 0 ? 'text-red-400' : 'text-[var(--text-secondary)]'
            }`} />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-[var(--text-secondary)]">Change: </span>
              <span className={`font-semibold ${
                percentChange > 0 ? 'text-green-400' : percentChange < 0 ? 'text-red-400' : 'text-[var(--text-secondary)]'
              }`}>
                {pctChangeDisplay}
              </span>
            </div>

            {/* Net flow mini chart */}
            <div className="w-20 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={netFlow}>
                  <Line 
                    type="monotone" 
                    dataKey="net" 
                    stroke={percentChange >= 0 ? "#10b981" : "#ef4444"} 
                    strokeWidth={1.5} 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Received Card */}
        <div className="glass p-4 md:p-6 rounded-xl border border-[var(--border)] hover:border-green-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm text-green-400">Received</div>
              <div className="text-xl md:text-2xl font-bold text-green-400 mt-1">
                {currency === "ZEC" 
                  ? (ghost ? obfuscateAmount(totals.rec) : `+${(safeNumber(totals.rec / 1e8)).toFixed(4)} ZEC`)
                  : (ghost ? "Hidden" : formatUSD(totals.rec))
                }
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <ChevronUp className="w-4 h-4 text-green-400" />
            </div>
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {filteredTxs.filter(t => t?.direction === "incoming").length} incoming transactions
          </div>
        </div>

        {/* Sent Card */}
        <div className="glass p-4 md:p-6 rounded-xl border border-[var(--border)] hover:border-red-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm text-red-400">Sent</div>
              <div className="text-xl md:text-2xl font-bold text-red-400 mt-1">
                {currency === "ZEC" 
                  ? (ghost ? obfuscateAmount(totals.sent) : `-${(safeNumber(totals.sent / 1e8)).toFixed(4)} ZEC`)
                  : (ghost ? "Hidden" : formatUSD(totals.sent))
                }
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <ChevronDown className="w-4 h-4 text-red-400" />
            </div>
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {filteredTxs.filter(t => t?.direction === "outgoing").length} outgoing transactions
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <div className="glass p-4 md:p-6 rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
              <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
              Volume Timeline
            </h3>
            <div className="text-sm text-[var(--text-secondary)]">
              {volume.length} days
            </div>
          </div>

          {volume.length === 0 ? (
            <div className="h-44 md:h-64 flex items-center justify-center text-[var(--text-secondary)]">
              No volume data for selected range
            </div>
          ) : (
            <div className="h-44 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volume} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="dateLabel" 
                    stroke="var(--text-secondary)" 
                    fontSize={11}
                    minTickGap={8}
                  />
                  <YAxis 
                    stroke="var(--text-secondary)" 
                    fontSize={11}
                    tickFormatter={(value) => `${value.toFixed(2)}`}
                  />
                  <Tooltip content={<AreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amt"
                    stroke="var(--accent)"
                    fill="url(#volumeGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Flow Distribution */}
        <div className="glass p-4 md:p-6 rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
              <PieChartIcon className="w-4 h-4 text-[var(--accent)]" />
              Flow Distribution
            </h3>
            <div className="text-sm text-[var(--text-secondary)]">
              {pie.reduce((a, b) => a + b.value, 0).toFixed(2)} ZEC total
            </div>
          </div>

          <div className="h-44 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pie}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-3 text-sm">
            {pie.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Transactions */}
      <div className="glass p-4 md:p-6 rounded-xl border border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm md:text-base">Top Transactions</h3>

          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)]">Sort by</span>
              <select 
                value={sortTopBy} 
                onChange={(e) => setSortTopBy(e.target.value as any)}
                className="glass px-2 py-1 rounded text-sm"
              >
                <option value="abs">Amount</option>
                <option value="time">Recent</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)]">Show</span>
              <select 
                value={String(topCount)} 
                onChange={(e) => setTopCount(Number(e.target.value))}
                className="glass px-2 py-1 rounded text-sm"
              >
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="10">10</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop / tablet table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-[var(--text-secondary)] border-b border-[var(--border)]">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Direction</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Memo</th>
              </tr>
            </thead>
            <tbody>
              {topTxs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[var(--text-secondary)]">
                    No transactions in selected range
                  </td>
                </tr>
              ) : (
                topTxs.map((tx, index) => (
                  <tr 
                    key={index}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]/50 transition-colors"
                  >
                    <td className="py-3">
                      {typeof tx.timestamp === "number" 
                        ? new Date(tx.timestamp * 1000).toLocaleDateString()
                        : "—"
                      }
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        tx.direction === "incoming" 
                          ? 'bg-green-500/10 text-green-400' 
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {tx.direction === "incoming" ? "IN" : "OUT"}
                      </span>
                    </td>
                    <td className="py-3 font-medium">
                      {currency === "ZEC" 
                        ? formatZecAmount(tx.amount || 0)
                        : (ghost ? "Hidden" : formatUSD(tx.amount || 0))
                      }
                    </td>
                    <td className="py-3 text-sm text-[var(--text-secondary)] max-w-xs truncate">
                      {tx.memo || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked list */}
        <div className="sm:hidden space-y-3">
          {topTxs.length === 0 ? (
            <div className="py-6 text-center text-[var(--text-secondary)]">No transactions in selected range</div>
          ) : (
            topTxs.map((tx, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">
                    {typeof tx.timestamp === "number" ? new Date(tx.timestamp * 1000).toLocaleDateString() : "—"}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {tx.direction === "incoming" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">IN</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">OUT</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold">
                    {currency === "ZEC" ? formatZecAmount(tx.amount || 0) : (ghost ? "Hidden" : formatUSD(tx.amount || 0))}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">{tx.txid ? tx.txid.slice(0, 8) + "…" : ""}</div>
                </div>
                <div className="text-sm text-[var(--text-secondary)] line-clamp-2">
                  {tx.memo || "—"}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--border)]">
          <div className="text-sm text-[var(--text-secondary)]">
            Showing {Math.min(topCount, topTxs.length)} of {filteredTxs.length} transactions
          </div>
          <button 
            onClick={exportTxsCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-[var(--surface)] transition-colors text-sm"
          >
            <Download className="w-3 h-3" />
            Export All {filteredTxs.length} TXs
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
