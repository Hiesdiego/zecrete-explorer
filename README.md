
# zecrete-explorer
Advanced Zcash blockchain explorer with shielded local transaction decryption. Enterprise-grade privacy analytics. Zero trust required.
=======
# Zecrete Explorer — Documentation

*Last updated: Dec 2025*

This documentation explains what **Zecrete Explorer** is, how privacy and local analysis work, architectural notes, developer API references for explorer operations, and user-facing feature explanations. Use this as the canonical /docs page for the project and as the basis for README, help pages, and the judge submission.

---

# What is Zecrete Explorer

Zecrete Explorer is a privacy-first, local-first toolkit for analyzing shielded Zcash transactions. It is built to run entirely in the client (browser or desktop) and provides:

* A transaction explorer for shielded transactions (Sapling/Orchard)
* Local-only privacy analytics and scoring (no network calls required)
* An offline Local AI to create narrative audit summaries and suggestions
* Developer-friendly APIs to scan, analyze, and export audit reports
* UX privacy features (Ghost Mode, obfuscation, sandboxed demo portfolio)
* Online real-time ZEC price
* Local Notebook for audit reporting, enterprise notes and personal reporting
* UI that makes you feel like you own the explorer

Zecrete is designed for security-conscious users, auditors. It is built to keep everything Zcash-secrete.

---

# How privacy works in Zecrete

Zecrete is built around a few core privacy guarantees and techniques:

## 1. UFVK (Unified Full Viewing Key)

* UFVK is the local key material that allows viewing/decrypting shielded transaction notes. Zecrete never transmits UFVK to any server.
* UFVK is stored only in local secure stores (in-memory store, optionally encrypted vault on the device). When you import/unlock a UFVK the app uses it only locally to derive wallet view and to decrypt notes client-side.

## 2. Local-only decrypt

* All decryption of shielded memos and note data happens inside the user's browser (or desktop app). No decrypted contents are sent to any remote server.
* The code paths that use UFVKs are intentionally synchronous/deterministic so the full analysis stack can run offline for reproducibility.

## 3. No data leaves your device

* Telemetry and remote inference are disabled by default. Any exporting of results (CSV, printable HTML, or PDF) is explicitly initiated by the user.
* The Local AI runs on deterministic local logic and simulated streaming — no models are fetched unless you intentionally integrate an optional local model runtime.

## 4. Ghost Mode

Ghost Mode is the user-facing privacy toggle that obfuscates all sensitive fields in the UI (txids, exact amounts, memos, timestamps). See the Ghost Mode section for details.

---

# Architecture (high level)

Below is a compact architecture diagram illustrating Zecrete's main runtime components and data flows.

```
+----------------------+      +----------------------+      +------------------+
|   Browser UI (React) | <--> | ExplorerStore (ctx) | <--> | Local Analysis    |
| - TransactionList    |      | - txs, filters, ui   |      | - assessPrivacy() |
| - LocalAIChat        |      | - scan, export apis  |      | - detectAnomalies  |
+----------------------+      +----------------------+      +------------------+
         ^   |                            |                          |
         |   | events / user actions     |                          |
         |   v                            v                          v
+----------------------+      +----------------------+      +------------------+
| Vault / UFVK Storage |      | Mock dataset / Demo  |      | Exporters (CSV/HTML)
| - getAllUnlockedKeys |      | - deterministic seed |      | - printable reports
+----------------------+      +----------------------+      +------------------+

Notes:
- All decryption & analysis run locally.
- ExplorerStore exposes functions for scanning, demo generation, and reporting.
```

---

# How portfolio sync works

Zecrete supports multiple ways to populate the explorer's transaction set:

1. **Real sync (when integrating with a full node or light client):**

   * The app requests blocks/transactions from a local or remote node (developer option).
   * Shielded notes that belong to the UFVK are decrypted client-side and appended to the `ExplorerStore.txs` array.

2. **Demo / Portfolio generator (deterministic mock):**

   * For demo or onboarding flows Zecrete can generate a deterministic, seeded portfolio using the `generatePortfolio` helper. This ensures reproducible datasets for demos and testing.
   * The portfolio generator is seeded by UFVK (or a stable seed) so the same seed produces the same mock dataset.

3. **Manual import:**

   * Users can import CSV or JSON exports produced by other applications; imported records are normalized into `TxRecord` objects.

4. **Incremental scanning & batch updates:**

   * Scans and incremental updates are applied as batches. The `startMockScan` or the real scan routine will push chunks of transactions and update the `progress` and `privacySummary` state.

Key implementation notes:

* The `ExplorerProvider` uses a stable flag in `localStorage` to mark when demo data has been loaded, preventing accidental loss on remounts and enabling deterministic rehydration.
* All portfolio updates compute a local privacy summary (see privacy snapshot) and emit `explorer:context` events for UI components.

---

# Ghost Mode — UI privacy protector

Ghost Mode is a single toggle that causes the UI to render obfuscated placeholders for:

* Transaction IDs (txid)
* Exact amounts (shows masked values)
* Memos and personal notes
* Precise timestamps

Ghost Mode is designed for screen-sharing and demos. Implementation details:

* A global helper `isGhostMode()` reads a persisted flag. Components subscribe to `eventBus` "ui:ghost" to update live.
* UI components must always check Ghost Mode before rendering sensitive information; obfuscation helpers are provided (e.g. `obfuscateMemo`, `obfuscateAmount`).

Security model:

* Ghost Mode is strictly a presentation-layer privacy feature — it does not alter encrypted data or UFVK handling. It helps avoid accidental leaks during demos or recording sessions. Trigger by pressing shift + q

---

# Feature explanations

## Anonymity set

**Definition:** the anonymity set is a measure of how many similar outputs exist in the observable dataset, which affects linkability of a given note.

**In Zecrete:** We approximate anonymity using local heuristics:

* Count of outputs with similar amounts (rounded buckets)
* Temporal clustering (how many outputs in a short time window)
* Pool diversity (sapling/orchard mixes)

Higher anonymity set -> stronger unlinkability.

## Cluster groups

**Definition:** groups of addresses/notes that appear to be related (heuristically) by memo content, timing, or repeated activity.

**In Zecrete:** clusters are produced by lightweight local heuristics (memo similarity, repeated counterparty patterns). These clusters are only computed locally and are used to provide the user with contextual insights (e.g., "these 6 txs look like the same merchant").

## Net flow

**Definition:** Net flow = total inbound - total outbound over a selected range.

Used to show whether funds are net positive or negative in a period. Net flow is expressed in ZEC and (optionally) USD using the local price feed.

## Total balance / Incoming / Outgoing

* **Total balance:** Sum of all resolved UTXO-equivalents or derived wallet balance from decrypted notes (depends on UFVK scope).
* **Incoming:** Sum of incoming amounts in a selected range.
* **Outgoing:** Sum of outgoing amounts in a selected range.

These metrics are recomputed whenever the transaction set or filters change.

## Privacy snapshot and its derivation

**Privacy snapshot** is a compact summary of the privacy posture of a wallet's transaction set. It includes:

* **Overall privacy score (0–100):** average of per-tx privacy scores.
* **High-risk count:** number of transactions with privacy score below the threshold (default 40).
* **Recommendations:** human readable advice (e.g. "avoid repeating memos", "avoid dust-sized outputs").

**Per-transaction privacy scoring** uses a small weighted heuristic:

* Dust value penalty (small outputs increase linkability)
* Memo risk (long memos or PII-like memos increase risk)
* Timing/linkability penalty (spikes or very small time gaps reduce privacy)

Pseudo formula (illustrative):

```
base = 100
if (isDust) base -= 15
base -= round(memoRisk * 25)
base -= round(timingRisk * 30)
privacyScore = clamp(0,100, base)
```

Where `memoRisk` ∈ [0,1] and `timingRisk` ∈ [0,1]. The `privacySummary` averages per-tx scores to produce the overall snapshot.

## Notebook & AI

Zecrete includes a "Notebook" area where users can keep notes, export audit results, and attach AI-generated narratives to analyses.

**Local AI** details:

* Local AI runs deterministic analysis functions and generates Markdown-like narrative summaries.
* It supports multiple modes (Summary/Conversational/Analyst) and returns structured payloads (chartData/tableData) for the UI.
* Streaming is simulated locally to provide the UX of typing/chunked responses while keeping all computation offline.

Notebook features:

* Save / load analysis snapshots
* Attach annotations to transactions or clusters
* Export as CSV or printable HTML report

---

# Full API reference (developer-facing)

> These APIs are exposed by the `ExplorerProvider` context and the `local-ai` agent. Use them when integrating or building features.

## ExplorerStore (React Context)

The provider returns an object with the following shape (TypeScript-like):

```ts
interface ExplorerStore {
  txs: TxRecord[];
  progress: { percentage?: number; status?: string } | null;
  privacySummary: { overallScore: number; recommendations: string[]; highRisk: number } | null;
  searchQuery: string;
  setSearchQuery(q: string): void;
  startMockScan(opts?: { count?: number }): Promise<void>;
  runPortfolioDemo(opts?: { users?: number; exchanges?: number; attackerClusters?: number; count?: number }): Promise<void>;
  startUltraMode(opts?: { count?: number; batchSize?: number }): Promise<{ cancel(): void } | void>;
  clearData(): void;
}
```

### Usage example (React)

```tsx
const explorer = useExplorer();

// Start a demo portfolio
await explorer.runPortfolioDemo({ users: 3, count: 500 });

// Kick off a mock scan
await explorer.startMockScan({ count: 200 });

// Read the latest privacy snapshot
console.log(explorer.privacySummary);
```

## Types

`TxRecord` (core normalized transaction record)

```ts
type TxRecord = {
  txid: string;
  height?: number;
  timestamp: number; // seconds since epoch
  pool?: string; // orchard / sapling
  amount: number; // sats (signed) — positive incoming, negative outgoing
  memo?: string;
  direction?: "incoming" | "outgoing";
  keyId?: string; // wallet key id
  fee?: number; // sats
  risk?: { privacyScore: number; warnings?: string[] };
  raw?: any; // original raw record
}
```

## local-ai agent (programmatic API)

Available functions (import from `@/lib/agent/local-ai`):

* `localAiAnswer(query: { question?: string; context?: TxRecord[] }, cfg?: { modePreference?: 'A'|'B'|'C'|'D'; price?: number }): Promise<AIResponse>`

  * Returns full analysis and structured payloads.

* `localAiAnswerStream(query, cfg, onChunk)`

  * Simulated streaming API that calls `onChunk(chunk: string)` progressively and resolves the full response.

* `detectAnomalies(txs: TxRecord[]): Anomaly[]`

  * Runs anomaly detection including auditor-defined rule pack matches.

* `assessPrivacy(tx, all): { privacyScore:number; warnings:string[] }`

  * Computes per-transaction privacy metrics.

### AIResponse (shape)

```ts
interface AIResponse {
  answer: string; // markdown-like narrative
  confidence: number;
  sources: TxRecord[]; // up to sample-sized records
  suggestions: string[];
  visualization: 'chart' | 'table' | null;
  chartData?: { label: string; value: number }[]; // values in ZEC typically
  tableData?: any[]; // anomaly rows
  auditNotes?: string;
  summary?: any; // structured summary object
}
```

### Example

```ts
import { localAiAnswer } from '@/lib/agent/local-ai';

const resp = await localAiAnswer({ question: 'Find anomalies in last 30 days', context: txs }, { price: 52.12 });
console.log(resp.answer);
// render resp.chartData to UI chart component
```

## Rule pack API (auditor rules)

Persisted in `localStorage` under `zecrete:ai:rules`.

* `listAiRules(): AiRule[]`
* `addAiRule(rule: { name:string; pattern:string; field: 'memo'|'address'|'txid'; severity: 'low'|'med'|'high' }): AiRule`
* `removeAiRule(id: string)`

Rules are applied by `detectAnomalies()` and surface annotated anomalies with `ruleId` and `severity`.

---

# Exporters

Zecrete provides two built-in export formats for audits:

* CSV audit exports: `exportAuditCSV({ summary, anomalies, top, recurring })` — produces a machine-readable CSV.
* Printable HTML: `exportAuditHTML({ title, summary, anomalies, top, recurring, privacyScore })` — suitable for printing or Save-as-PDF.

These are called by UI helpers and intentionally executed only on user action. They do not trigger network calls.

---

# Security considerations & production notes

* **UFVK handling:** Keep UFVKs in the OS-provided secure store or encrypted storage; never persist plain UFVK to localStorage.
* **WASM & Performance:** Consider moving heavy crypto and decryption into a WASM module (Rust) for speed and to reduce JS stack attack surface.
* **Local AI models:** If you introduce an on-device model (GGUF), prefer using a WASM runtime or native desktop bundling; ensure users explicitly opt into downloading model binaries.
* **Telemetry & opt-in:** All telemetry should be opt-in and opt-outable. Default is "no telemetry".

---

# FAQ (quick answers)

**Q: Does Zecrete send my transactions anywhere?**

A: No. All decryption and analysis are local-only. Exports are user-initiated.

**Q: Can Zecrete deanonymize shielded transactions?**

A: No. Zecrete provides heuristics and privacy scoring. It does not attempt cryptographic deanonymization.

**Q: How does demo portfolio remain stable?**

A: The generator is seeded deterministically from the UFVK or a stable seed. Same seed → same mock data.

---

# Contributing & extending

* Use the `ExplorerProvider` and `useExplorer()` context to integrate with UI components.
* Add new analysis modules under `src/lib/agent/` and expose small pure functions for unit testing.
* Keep all UFVK and decryption logic inside a single module so it can be replaced with a WASM-backed implementation later.

---

# Appendix: Glossary

* **UFVK** — Unified Full Viewing Key, local key material for decrypting shielded notes.
* **Ghost Mode** — UI toggle that obfuscates sensitive fields for demos.
* **Anonymity set** — heuristic measure of how indistinguishable an output is among similar outputs.
* **Cluster** — group of transactions that appear related under local heuristics.

---


