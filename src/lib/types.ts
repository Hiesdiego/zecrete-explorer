// src/lib/types.ts - Enhanced Type System for Zecrete Explorer

// ============================================================================
// BLOCKCHAIN TYPES
// ============================================================================

export type Network = "mainnet" | "testnet" | "mocknet";
export type Pool = "sapling" | "orchard" | "transparent";
export type Direction = "incoming" | "outgoing" | "internal";

export interface BlockHeader {
  height: number;
  hash: string;
  timestamp: number;
  version: number;
}

export interface CompactBlock {
  header: BlockHeader;
  vtx: CompactTransaction[];
}

export interface CompactTransaction {
  index: number;
  hash: string;
  outputs: CompactOutput[];
}

export interface CompactOutput {
  cmu: string;
  epk: string;
  ciphertext: string;
}

// ============================================================================
// TRANSACTION & NOTE TYPES
// ============================================================================

export interface TxRecord {
  txid: string;
  height: number;
  timestamp: number;
  pool: Pool;
  amount: number; // in zats (satoshis)
  memo?: string;
  direction: Direction;
  keyId: string;
  address?: string;
  confirmations?: number;
  risk?: RiskAssessment;
  metadata?: TxMetadata;
}

export interface TxMetadata {
  category?: string; // "payment", "donation", "salary", etc.
  contact?: string; // derived from memo or manual tag
  notes?: string; // user notes
  tags?: string[];
  isRecurring?: boolean;
  linkedTxIds?: string[]; // for chaining
}

export interface RiskAssessment {
  dust: boolean;
  timingLinkability: number; // 0-1
  memoRisk: number; // 0-1
  privacyScore: number; // 0-100
  anomalyScore?: number; // 0-100
  warnings: string[];
}

export interface ShieldedNote {
  noteId: string;
  txid: string;
  position: number;
  value: number;
  memo?: string;
  spent: boolean;
  spentInTx?: string;
}

// ============================================================================
// WALLET & KEY TYPES
// ============================================================================

export interface WalletKey {
  id: string;
  name: string;
  ufvk: string;
  color: string; // for UI differentiation
  createdAt: number;
  lastSync?: number;
  health?: KeyHealth;
  balance?: WalletBalance;
}

export interface WalletBalance {
  total: number;
  sapling: number;
  orchard: number;
  transparent: number;
  pending: number;
}

export interface KeyHealth {
  keyId: string;
  entropyScore: number; // 0-1
  pastejackSuspected: boolean;
  patternRisk: "low" | "medium" | "high";
  warnings: string[];
  strength: "weak" | "moderate" | "strong" | "excellent";
}

export interface Portfolio {
  keys: WalletKey[];
  totalBalance: number;
  totalReceived: number;
  totalSent: number;
  transactions: TxRecord[];
  lastUpdated: number;
}

// ============================================================================
// SCAN & SYNC TYPES
// ============================================================================

export interface ScanParams {
  network: Network;
  startHeight?: number;
  endHeight?: number;
  batchSize?: number;
  poolFilter?: Pool[];
}

export interface ScanProgress {
  current: number;
  total: number;
  percentage: number;
  blocksPerSecond?: number;
  estimatedTimeRemaining?: number;
  status: "idle" | "scanning" | "decrypting" | "complete" | "error";
}

export interface ScanResult {
  transactions: TxRecord[];
  notes: ShieldedNote[];
  lastHeight: number;
  errors?: string[];
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  label?: string;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

export interface FlowAnalysis {
  inflow: TimeSeriesData[];
  outflow: TimeSeriesData[];
  netFlow: TimeSeriesData[];
  volume: number;
  volatility: number;
}

export interface PrivacyMetrics {
  overallScore: number;
  transactionCount: number;
  dustTransactions: number;
  highRiskTransactions: number;
  memoUsage: number; // percentage
  timingRiskAverage: number;
  recommendations: string[];
}

export interface HeatmapData {
  date: string;
  hour?: number;
  count: number;
  volume: number;
  intensity: number; // 0-1
}

// ============================================================================
// SEARCH & QUERY TYPES
// ============================================================================

export interface SearchQuery {
  term: string;
  fields: ("memo" | "txid" | "address" | "amount")[];
  dateRange?: { start: number; end: number };
  amountRange?: { min: number; max: number };
  direction?: Direction;
  pool?: Pool;
  keyId?: string;
}

export interface SearchResult {
  transaction: TxRecord;
  matchedFields: string[];
  relevanceScore: number;
}

export interface NotebookQuery {
  sql: string;
  params?: Record<string, any>;
}

export interface NotebookResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
}

// ============================================================================
// AI ASSISTANT TYPES
// ============================================================================

export interface AIQuery {
  question: string;
  context?: TxRecord[];
  conversationId?: string;
}

export interface AIResponse {
  answer: string;
  confidence: number;
  sources?: TxRecord[];
  suggestions?: string[];
  visualization?: "chart" | "table" | "heatmap" | null;
}

export interface AIInsight {
  type: "spending" | "income" | "pattern" | "anomaly" | "privacy";
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  relatedTxIds: string[];
  actionable: boolean;
  action?: string;
}

// ============================================================================
// PRIVACY & SECURITY TYPES
// ============================================================================

export interface GhostModeState {
  enabled: boolean;
  fakeHistory: TxRecord[];
  obfuscationLevel: "minimal" | "moderate" | "maximum";
}

export interface FirewallCheck {
  txData: Partial<TxRecord>;
  risks: {
    memoLength: boolean;
    amountPattern: boolean;
    timingRisk: boolean;
    poolSelection: boolean;
  };
  overallRisk: "low" | "medium" | "high";
  recommendations: string[];
}

export interface AntiPhishingCheck {
  keyPasted: boolean;
  malwareIndicators: string[];
  compromisedPatterns: boolean;
  trustScore: number; // 0-100
  warnings: string[];
}

// ============================================================================
// TEAM & ENTERPRISE TYPES
// ============================================================================

export interface TeamMember {
  id: string;
  name: string;
  role: "owner" | "cfo" | "accountant" | "auditor" | "viewer";
  permissions: Permission[];
  keyAccess: string[]; // wallet key IDs
}

export interface Permission {
  resource: "transactions" | "balance" | "keys" | "reports";
  actions: ("read" | "write" | "delete" | "export")[];
}

export interface ZKAttestation {
  type: "solvency" | "holdings" | "expenses" | "compliance";
  timestamp: number;
  proofHash: string;
  verified: boolean;
  metadata?: Record<string, any>;
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

export interface EncryptedVault {
  version: number;
  salt: string;
  iv: string;
  ciphertext: string;
  createdAt: number;
  lastAccess?: number;
}

export interface StorageMetadata {
  version: number;
  keyCount: number;
  txCount: number;
  lastSync: number;
  storageSize: number;
}

// ============================================================================
// ENGINE & WORKER TYPES
// ============================================================================

export type EngineMode = "mock" | "wasm" | "hybrid";

export interface EngineConfig {
  mode: EngineMode;
  wasmPath?: string;
  cacheEnabled: boolean;
  parallelWorkers: number;
  debugMode: boolean;
}

export interface WorkerMessage {
  type: "scan" | "decrypt" | "analyze" | "search" | "cancel";
  payload: any;
  requestId: string;
}

export interface WorkerResponse {
  type: "progress" | "result" | "error" | "complete";
  payload: any;
  requestId: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface AppState {
  initialized: boolean;
  unlocked: boolean;
  ghostMode: GhostModeState;
  activeKeyId: string | null;
  portfolio: Portfolio | null;
  syncing: boolean;
  scanProgress: ScanProgress;
}

export interface UIPreferences {
  theme: "dark" | "light" | "cyberpunk";
  soundEnabled: boolean;
  animationsEnabled: boolean;
  defaultView: "dashboard" | "transactions" | "analytics";
  chartType: "area" | "bar" | "line";
  privacyMode: "relaxed" | "balanced" | "paranoid";
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export interface FeatureFlags {
  multiKey: boolean;
  aiAssistant: boolean;
  notebookMode: boolean;
  crossChain: boolean;
  teamMode: boolean;
  offlineMode: boolean;
  advancedAnalytics: boolean;
  timeCapsule: boolean;
  zkFirewall: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CONSTANTS = {
  ZATS_PER_ZEC: 1e8,
  MIN_CONFIRMATIONS: 10,
  DUST_THRESHOLD: 10_000_000, // 0.1 ZEC
  AUTO_LOCK_MINUTES: 10,
  MAX_MEMO_LENGTH: 512,
  SAFE_MEMO_LENGTH: 140,
  DEFAULT_START_HEIGHT: 2_850_000,
  BLOCKS_PER_BATCH: 1000,
} as const;

export const PRIVACY_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  MODERATE: 60,
  POOR: 40,
  CRITICAL: 25,
} as const;

export const COLORS = {
  POOLS: {
    sapling: "#8b5cf6",
    orchard: "#06b6d4",
    transparent: "#f59e0b",
  },
  RISK: {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef4444",
  },
  DIRECTION: {
    incoming: "#10b981",
    outgoing: "#ef4444",
    internal: "#6366f1",
  },
} as const;