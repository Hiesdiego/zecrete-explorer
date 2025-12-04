/**
 * Zecrete Local AI (Advanced) 
 *
 * - deterministic, local-only reasoning over transaction arrays.
 * - multi-mode answer generation (A: Markdown, B: Conv, C: Analyst).
 * - returns structured visualization (chartData & tableData).
 * - streaming API (localAiAnswerStream) that simulates chunked/typing output.
 * - auditor-friendly rule pack persisted in localStorage (add/list/remove).
 * - audit export helpers (CSV + printable HTML).
 *
 * No network calls. All logic runs locally.
 */

import type { TxRecord } from "@/lib/types";

/* -------------------------
   Basic helpers
   ------------------------- */

function nowSec() { return Math.floor(Date.now() / 1000); }
function prettyZec(zats: number) { return `${(zats / 1e8).toFixed(6)} ZEC`; }
function prettyUsd(zec: number, price = 0) { if (!price) return `$${(zec).toFixed(4)}`; return `$${(zec * price).toFixed(2)}`; }
function safeSlice<T>(arr: T[], n: number) { return arr.slice(0, Math.min(n, arr.length)); }

/* -------------------------
   Rule pack (configurable)
   - persisted in localStorage under "zecrete:ai:rules"
   - rule shape: { id, name, pattern (string), field: "memo"|"address"|"txid", severity: "low"|"med"|"high", description }
   ------------------------- */
type AiRule = { id: string; name: string; pattern: string; field: "memo"|"address"|"txid"; severity: "low"|"med"|"high"; description?: string };

const RULES_KEY = "zecrete:ai:rules";

export function listAiRules(): AiRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AiRule[];
  } catch {
    return [];
  }
}

export function addAiRule(rule: Omit<AiRule, "id">) {
  try {
    const rules = listAiRules();
    const id = `r_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const r: AiRule = { id, ...rule };
    rules.unshift(r);
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
    return r;
  } catch (e) {
    throw new Error("Failed to add rule");
  }
}

export function removeAiRule(id: string) {
  try {
    const rules = listAiRules().filter(r => r.id !== id);
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
    return true;
  } catch {
    return false;
  }
}

export function clearAiRules() {
  try {
    localStorage.removeItem(RULES_KEY);
  } catch {}
}

/* -------------------------
   Range parsing & intent classification
   ------------------------- */

export function parseNaturalRange(q: string): { from: number; to: number } | null {
  q = (q || "").toLowerCase();
  const now = nowSec();
  if (q.includes("last week") || q.includes("past week")) return { from: now - 7 * 24 * 3600, to: now };
  if (q.includes("last month") || q.includes("past month")) return { from: now - 30 * 24 * 3600, to: now };
  if (q.includes("last 24") || q.includes("past 24") || q.includes("last day") || q.includes("today")) return { from: now - 24 * 3600, to: now };
  if (q.includes("yesterday")) return { from: now - 2 * 24 * 3600, to: now - 24 * 3600 };
  const m = q.match(/last\s+(\d+)\s+days?/);
  if (m) { const d = Number(m[1]); return { from: now - d * 24 * 3600, to: now }; }
  return null;
}
export function classifyIntent(q: string) {
  const t = (q || "").toLowerCase();
  if (/\b(recurring|subscription|monthly|repeat|repeatable)\b/.test(t)) return "recurring";
  if (/\b(how much|total|sum|spent|received|balance|net)\b/.test(t)) return "totals";
  if (/\b(find|show|search|where|which)\b/.test(t)) return "search";
  if (/\b(anomaly|unusual|suspici|alert|flag)\b/.test(t)) return "anomaly";
  if (/\b(privacy|linkab|memo|dust|timing|score)\b/.test(t)) return "privacy";
  if (/\b(compare|trend|trendline|compare to|vs)\b/.test(t)) return "trend";
  if (/\b(who|contact|counterparty|to whom|to)\b/.test(t)) return "counterparty";
  return "general";
}

/* -------------------------
   Analytics primitives
   ------------------------- */

export function filterByRange(txs: TxRecord[], range?: { from: number; to: number }) {
  if (!range) return txs;
  return txs.filter((t) => (typeof t.timestamp === "number") && t.timestamp >= range.from && t.timestamp <= range.to);
}

export function totalsInRange(txs: TxRecord[]) {
  const incoming = txs.filter((t) => t.direction === "incoming").reduce((a, b) => a + Math.abs(b.amount), 0);
  const outgoing = txs.filter((t) => t.direction === "outgoing").reduce((a, b) => a + Math.abs(b.amount), 0);
  return { incoming, outgoing, net: incoming - outgoing, count: txs.length };
}

export function topCounterparties(txs: TxRecord[], limit = 8) {
  const map = new Map<string, { count: number; total: number; txids: string[] }>();
  for (const t of txs) {
    const label = (t.memo && t.memo.trim()) || (t.address || t.keyId) || "unknown";
    if (!label) continue;
    const cur = map.get(label) ?? { count: 0, total: 0, txids: [] };
    cur.count++;
    cur.total += Math.abs(t.amount);
    cur.txids.push(t.txid ?? "");
    map.set(label, cur);
  }
  const items = Array.from(map.entries()).map(([label, v]) => ({ label, ...v }));
  items.sort((a, b) => b.total - a.total);
  return items.slice(0, limit);
}

export function detectRecurring(txs: TxRecord[]) {
  const groups = new Map<string, { txs: TxRecord[]; sum: number }>();
  for (const t of txs) {
    const key = (t.memo || "").toLowerCase().replace(/\d+/g, "").replace(/[^a-z0-9\s]/g, "").trim();
    if (!key) continue;
    const g = groups.get(key) ?? { txs: [], sum: 0 };
    g.txs.push(t);
    g.sum += Math.abs(t.amount);
    groups.set(key, g);
  }
  const recurring: { memo: string; count: number; total: number; medianGap: number }[] = [];
  for (const [k, v] of groups) {
    if (v.txs.length >= 2) {
      const sorted = v.txs.map(x => x.timestamp).sort((a,b)=>a-b);
      const gaps: number[] = [];
      for (let i=1;i<sorted.length;i++) gaps.push(sorted[i]-sorted[i-1]);
      const medianGap = gaps.length ? gaps.sort((a,b)=>a-b)[Math.floor(gaps.length/2)] : 0;
      recurring.push({ memo: k, count: v.txs.length, total: v.sum, medianGap });
    }
  }
  recurring.sort((a,b)=>b.total-a.total);
  return recurring;
}

export function computeTimingRisk(tx: TxRecord, all: TxRecord[]) {
  const sorted = [...all].sort((a,b)=> (a.timestamp||0) - (b.timestamp||0));
  const idx = sorted.findIndex(t => t.txid === tx.txid);
  if (idx <= 0) return 0.1;
  const gap = (tx.timestamp || 0) - (sorted[idx-1].timestamp || 0);
  if (gap < 60) return 0.95;
  if (gap < 120) return 0.8;
  if (gap < 300) return 0.6;
  if (gap < 600) return 0.4;
  return 0.1;
}

/* anomaly detection enhanced with rule pack */
export function detectAnomalies(txs: TxRecord[]) {
  if (!txs.length) return [];

  const rules = listAiRules(); // auditor-defined rules

  const amounts = txs.map(t => Math.abs(t.amount));
  const mean = amounts.reduce((a,b)=>a+b,0)/amounts.length;
  const variance = amounts.reduce((a,b)=>a + (b-mean)*(b-mean),0)/amounts.length;
  const std = Math.sqrt(variance || 0.0000001);

  const anomalies: { tx: TxRecord; z?: number; reason: string; ruleId?: string; severity?: string }[] = [];

  for (const t of txs) {
    // z-score amount extremes
    const z = Math.abs(Math.abs(t.amount) - mean) / (std || 1);
    if (z > 3) anomalies.push({ tx: t, z, reason: "amount extreme", severity: "high" });

    // apply rule pack matches (memo/address/txid)
    for (const r of rules) {
      try {
        const re = new RegExp(r.pattern, "i");
        let target = "";
        if (r.field === "memo") target = String(t.memo || "");
        if (r.field === "address") target = String(t.address || "");
        if (r.field === "txid") target = String(t.txid || "");
        if (re.test(target)) {
          anomalies.push({ tx: t, reason: `rule:${r.name}`, ruleId: r.id, severity: r.severity });
        }
      } catch (e) {
        // ignore invalid rule regex
      }
    }
  }

  // temporal burst detection (hourly)
  const buckets = new Map<number, TxRecord[]>();
  for (const t of txs) {
    const b = Math.floor((t.timestamp || 0) / 3600);
    const arr = buckets.get(b) ?? [];
    arr.push(t);
    buckets.set(b, arr);
  }
  for (const [b, arr] of buckets) {
    if (arr.length > 6) {
      anomalies.push({ tx: arr[0], reason: `burst ${arr.length} tx/hr`, severity: "med" });
    }
  }

  // dedupe by txid (keep first)
  const seen = new Set<string>();
  const out: typeof anomalies = [];
  for (const a of anomalies) {
    const id = a.tx.txid || JSON.stringify(a.tx);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(a);
  }

  return out.slice(0, 200);
}

export function inferCategory(memo?: string) {
  if (!memo) return "unknown";
  const m = memo.toLowerCase();
  if (m.includes("coffee") || m.includes("cafe") || m.includes("espresso")) return "food";
  if (m.includes("donation") || m.includes("donate")) return "donation";
  if (m.includes("invoice") || m.includes("bill")) return "invoice";
  if (m.includes("tip")) return "tip";
  if (m.includes("refund")) return "refund";
  return "other";
}

export function assessPrivacy(tx: TxRecord, all: TxRecord[]) {
  const dust = Math.abs(tx.amount) < 10_000_000;
  const memoRisk = tx.memo && tx.memo.length > 140 ? 0.7 : (tx.memo ? 0.2 : 0.0);
  const timing = computeTimingRisk(tx, all);
  const base = 100 - (dust ? 15 : 0) - Math.round(memoRisk * 25) - Math.round(timing * 30);
  const privacyScore = Math.max(0, Math.min(100, base));
  const warnings: string[] = [];
  if (dust) warnings.push("Dust-sized output");
  if (memoRisk > 0.5) warnings.push("Potential PII in memo");
  if (timing > 0.7) warnings.push("High timing linkability");
  return { privacyScore, warnings, memoRisk, timing };
}

/* -------------------------
   Formatters (A/B/C)
   ------------------------- */

function mkHeader(title: string) { return `### ${title}\n\n`; }
function mkList(items: string[]) { return items.map(i => `- ${i}`).join("\n") + "\n\n"; }
function mkTableSimple(rows: string[][]) {
  const widths: number[] = [];
  for (const r of rows) r.forEach((c, i) => widths[i] = Math.max(widths[i] ?? 0, c.length));
  const pad = (s: string, w: number) => s + " ".repeat(w - s.length);
  const lines = rows.map(r => "| " + r.map((c,i)=>pad(c,widths[i])).join(" | ") + " |");
  return lines.join("\n") + "\n\n";
}

function answerA(params: any) {
  const { summary, top, recurring, anomalies, privacy, price } = params;
  let out = "";
  out += mkHeader("Summary");
  out += mkList([
    `Incoming: ${prettyZec(summary.incoming)}${price ? ` (${prettyUsd(summary.incoming/1e8, price)})` : ""}`,
    `Outgoing: ${prettyZec(summary.outgoing)}${price ? ` (${prettyUsd(summary.outgoing/1e8, price)})` : ""}`,
    `Net: ${prettyZec(summary.net)}${price ? ` (${prettyUsd(summary.net/1e8, price)})` : ""}`,
    `Transactions analyzed: ${summary.count}`
  ]);
  out += mkHeader("Top counterparties");
  if (top.length === 0) out += "No counterparties detected.\n\n";
  else out += mkList(top.map((t:any) => `${t.label} — ${prettyZec(t.total)} (${t.count ?? "?"} tx)`));
  if (recurring && recurring.length) {
    out += mkHeader("Recurring patterns");
    out += mkList(recurring.map((r:any) => `${r.memo} — ${r.count} payments (${prettyZec(r.total)})`));
  }
  if (anomalies && anomalies.length) {
    out += mkHeader("Anomalies & alerts");
    out += mkList(anomalies.slice(0,5).map((a:any) => `${a.reason} — ${a.tx.txid?.slice(0,10) ?? "tx"} (${prettyZec(a.tx.amount)})`));
  }
  out += mkHeader("Privacy snapshot");
  out += mkList([`Overall privacy score: ${privacy.overall}/100`, `${privacy.highRiskCount} high-risk transactions`]);
  out += "\n*Generated by Zecrete Local AI — offline mode.*\n";
  return out;
}
function answerB(params: any) {
  const { summary, top, recurring, anomalies, privacy, price } = params;
  const lines: string[] = [];
  lines.push(`In the period examined you had ${summary.count} transactions. You received ${prettyZec(summary.incoming)} and sent ${prettyZec(summary.outgoing)}, for a net of ${prettyZec(summary.net)}.`);
  if (top.length) lines.push(`Your largest counterparties were ${top.slice(0,3).map((t:any) => `${t.label} (${prettyZec(t.total)})`).join(", ")}.`);
  if (recurring.length) lines.push(`I detected ${recurring.length} recurring payment patterns (e.g. subscriptions or monthly payments).`);
  if (anomalies.length) lines.push(`I flagged ${anomalies.length} unusual items — see "Anomalies & alerts" for details.`);
  lines.push(`Privacy: overall score ${privacy.overall}/100; ${privacy.highRiskCount} transactions marked high-risk.`);
  if (price) lines.push(`ZEC spot price used: $${price.toFixed(4)}.`);
  return lines.join(" ");
}
function answerC(params: any) {
  const { summary, top, recurring, anomalies, privacy, price } = params;
  let out = "";
  out += "=== FLOW SUMMARY ===\n";
  out += `Inbound: ${prettyZec(summary.incoming)}\n`;
  out += `Outbound: ${prettyZec(summary.outgoing)}\n`;
  out += `Net: ${prettyZec(summary.net)}\n`;
  out += `Tx Count: ${summary.count}\n\n`;
  out += "=== TOP counterparties ===\n";
  out += top.map((t:any) => `${t.label}\t${prettyZec(t.total)}\t${t.count ?? "?"}`).join("\n") + "\n\n";
  if (recurring.length) {
    out += "=== RECURRING (top) ===\n";
    out += recurring.slice(0,5).map((r:any)=>`${r.memo}\t${r.count}\t${prettyZec(r.total)}`).join("\n") + "\n\n";
  }
  if (anomalies.length) {
    out += "=== ANOMALIES ===\n";
    out += anomalies.slice(0,10).map((a:any)=>`${a.reason}\t${a.tx.txid?.slice(0,10)}\t${prettyZec(a.tx.amount)}`).join("\n") + "\n\n";
  }
  out += `PRIVACY SCORE: ${privacy.overall}/100 (${privacy.highRiskCount} high-risk)\n`;
  if (price) out += `PRICE: $${price.toFixed(4)}\n`;
  out += "\n-- End of report --\n";
  return out;
}

/* -------------------------
   Audit export helpers
   ------------------------- */

export function exportAuditCSV(params: {
  summary: { incoming: number; outgoing: number; net: number; count: number };
  anomalies: any[];
  top: any[];
  recurring: any[];
}) {
  const rows: string[][] = [];
  rows.push(["section", "key", "value"]);
  rows.push(["summary", "incoming_sats", String(params.summary.incoming)]);
  rows.push(["summary", "outgoing_sats", String(params.summary.outgoing)]);
  rows.push(["summary", "net_sats", String(params.summary.net)]);
  rows.push(["summary", "count", String(params.summary.count)]);
  rows.push([]);
  rows.push(["anomalies", "txid", "reason", "severity"]);
  for (const a of params.anomalies) {
    rows.push(["anomalies", String(a.tx?.txid ?? ""), String(a.reason ?? ""), String(a.severity ?? "")]);
  }
  rows.push([]);
  rows.push(["top", "label", "total_sats", "count"]);
  for (const t of params.top) rows.push(["top", t.label, String(t.total ?? 0), String(t.count ?? 0)]);
  rows.push([]);
  rows.push(["recurring", "memo", "count", "total_sats"]);
  for (const r of params.recurring) rows.push(["recurring", r.memo, String(r.count), String(r.total)]);
  // produce CSV string
  return rows.map(r => r.map(c => {
    if (c === null || c === undefined) return "";
    const s = String(c);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }).join(",")).join("\n");
}

/**
 * Create printable HTML summary (suitable for window.open and print/save-as-PDF)
 */
export function exportAuditHTML(params: {
  title?: string;
  summary: { incoming: number; outgoing: number; net: number; count: number };
  price?: number | null;
  anomalies: any[];
  top: any[];
  recurring: any[];
  privacyScore?: number | null;
}) {
  const { title = "Zecrete Audit Report", summary, price, anomalies, top, recurring, privacyScore } = params;
  function fmtSats(n: number) { return `${(n/1e8).toFixed(6)} ZEC`; }
  const rowsAnom = anomalies.map(a => `<tr><td><code>${a.tx?.txid ?? ""}</code></td><td>${a.reason}</td><td>${a.severity ?? ""}</td><td>${fmtSats(Math.abs(a.tx?.amount || 0))}</td></tr>`).join("\n");
  const rowsTop = top.map(t => `<tr><td>${t.label}</td><td>${(t.total/1e8).toFixed(6)}</td><td>${t.count}</td></tr>`).join("\n");
  const rowsRec = recurring.map(r => `<tr><td>${r.memo}</td><td>${r.count}</td><td>${(r.total/1e8).toFixed(6)}</td></tr>`).join("\n");
  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body{font-family: Inter, Arial, sans-serif; color: #0f172a; padding:24px}
      h1{font-size:20px;margin-bottom:4px}
      .meta{color:#475569;font-size:12px;margin-bottom:12px}
      table{width:100%;border-collapse:collapse;margin-bottom:12px}
      th,td{border:1px solid #e6eef7;padding:8px;text-align:left;font-size:12px}
      th{background:#f1f5f9}
      code{background:#f8fafc;padding:2px 4px;border-radius:4px}
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <div class="meta">Generated: ${new Date().toLocaleString()}</div>
    <h3>Summary</h3>
    <table><tbody>
      <tr><th>Incoming</th><td>${fmtSats(summary.incoming)}${price ? ` (${prettyUsd(summary.incoming/1e8, price)})` : ""}</td></tr>
      <tr><th>Outgoing</th><td>${fmtSats(summary.outgoing)}${price ? ` (${prettyUsd(summary.outgoing/1e8, price)})` : ""}</td></tr>
      <tr><th>Net</th><td>${fmtSats(summary.net)}${price ? ` (${prettyUsd(summary.net/1e8, price)})` : ""}</td></tr>
      <tr><th>Transactions analyzed</th><td>${summary.count}</td></tr>
      ${privacyScore ? `<tr><th>Privacy score</th><td>${privacyScore}/100</td></tr>` : ""}
    </tbody></table>

    <h3>Top counterparties</h3>
    <table><thead><tr><th>Label</th><th>Total (ZEC)</th><th>Count</th></tr></thead><tbody>${rowsTop}</tbody></table>

    <h3>Recurring patterns</h3>
    <table><thead><tr><th>Memo</th><th>Count</th><th>Total (ZEC)</th></tr></thead><tbody>${rowsRec}</tbody></table>

    <h3>Anomalies</h3>
    <table><thead><tr><th>Txid</th><th>Reason</th><th>Severity</th><th>Amount</th></tr></thead><tbody>${rowsAnom}</tbody></table>

    <div style="margin-top:12px;color:#475569;font-size:12px">Report generated by Zecrete Local AI — offline. No data left your device.</div>
  </body>
  </html>`;
  return html;
}

/* -------------------------
   Top-level API + streaming helper
   ------------------------- */

export type LocalAiConfig = {
  modePreference?: "A" | "B" | "C" | "D";
  price?: number;
  streamingDelayMs?: number; // optional override for streaming speed
};

export async function localAiAnswer(query: { question?: string; context?: TxRecord[]; txs?: TxRecord[] }, cfg?: LocalAiConfig) {
  const qRaw = query.question ?? "";
  const q = qRaw.trim();
  const allTxs = query.context ?? query.txs ?? [];
  const preference = cfg?.modePreference ?? "D";

  const intent = classifyIntent(q);
  const range = parseNaturalRange(q) ?? undefined;
  const txs = range ? filterByRange(allTxs, range) : allTxs;

  // analytics
  const summary = totalsInRange(txs);
  const top = topCounterparties(txs, 8);
  const recurring = detectRecurring(txs);
  const anomalies = detectAnomalies(txs);
  const privacyPerTx = txs.map(t => assessPrivacy(t, txs));
  const highRiskCount = privacyPerTx.filter(p => p.privacyScore < 40).length;
  const privacySummary = { overall: Math.round((privacyPerTx.reduce((a,b)=>a+(b.privacyScore||70),0) / Math.max(1, privacyPerTx.length))), highRiskCount };

  // prepare visualization payloads
  const chartData = top.map(t => ({ label: t.label, value: +(t.total / 1e8) })); // value in ZEC
  const tableData = anomalies.map(a => ({ txid: a.tx.txid, reason: a.reason, amountZec: +(Math.abs(a.tx.amount) / 1e8), ts: a.tx.timestamp, severity: a.severity }));

  // audit notes (small textual summary)
  const auditNotes = `Detected ${anomalies.length} anomalies and ${recurring.length} recurring patterns. Privacy score: ${privacySummary.overall}/100 (${privacySummary.highRiskCount} high-risk).`;

  // style selection
  let style: "A" | "B" | "C" = "A";
  const pref = (cfg?.modePreference ?? "D");
  if (pref === "A" || pref === "B" || pref === "C") style = pref as any;
  else {
    if (intent === "anomaly" || intent === "privacy" || intent === "counterparty") style = "C";
    else if (intent === "totals" || intent === "recurring" || intent === "general") style = "A";
    else style = "B";
  }

  const common = { summary, top: top.map(t=>({ label: t.label, total: t.total, count: t.count })), recurring, anomalies, privacy: privacySummary, price: cfg?.price };

  let answerText = "";
  let visualization: "chart" | "table" | null = null;
  if (style === "A") { answerText = answerA(common as any); visualization = "chart"; }
  else if (style === "B") { answerText = answerB(common as any); visualization = null; }
  else { answerText = answerC(common as any); visualization = "table"; }

  // suggestions & follow-ups (richer set)
  const suggestions: string[] = [];
  if (intent === "recurring") suggestions.push("Mark recurring transactions as subscriptions");
  if (intent === "privacy") suggestions.push("Review high-risk transactions");
  suggestions.push("Show top counterparties");
  suggestions.push("Export selected transactions");
  suggestions.push("Show raw transactions for anomalies");
  suggestions.push("Generate audit export (CSV)");

  // confidence
  let confidence = 0.6;
  if (style === "A") confidence = 0.85;
  if (style === "C") confidence = 0.92;

  // compact sources (sample tx objects)
  const sources = safeSlice(txs, 12).map(t => t);

  return {
    answer: answerText,
    confidence,
    sources,
    suggestions,
    visualization,
    chartData,
    tableData,
    auditNotes,
    summary,
    top,
    recurring,
    privacySummary
  };
}

/**
 * Simulated streaming: calls onChunk repeatedly with progressively longer slices of the full answer.
 * Returns full response when done.
 */
export async function localAiAnswerStream(
  query: { question?: string; context?: TxRecord[]; txs?: TxRecord[] },
  cfg: LocalAiConfig|undefined,
  onChunk: (chunk: string) => Promise<void> | void
) {
  const resp = await localAiAnswer(query, cfg);
  const text = resp.answer ?? "";
  // naive chunking: split by sentences, then gradually reveal
  const sentences = text.split(/(\. |\n|\n\n)/).filter(Boolean);
  let accumulated = "";
  for (let i = 0; i < sentences.length; i++) {
    accumulated += (i === 0 ? "" : "") + sentences[i];
    // simulate delay per chunk
    try {
      await onChunk(accumulated);
    } catch {}
    const delay = (cfg?.streamingDelayMs ?? 120) + Math.min(300, Math.floor(accumulated.length / 60) * 40);
    await new Promise(r => setTimeout(r, delay));
  }
  return resp;
}