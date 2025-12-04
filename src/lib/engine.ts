// src/lib/engine.ts
import type { EngineMode, EngineConfig, ScanParams, ScanProgress, ScanResult, TxRecord, ShieldedNote, WalletKey } from "./types";
import { assessTransactionRisk } from "./risk";
import { CONSTANTS } from "./types";
export class ZecreteEngine {
  private mode: EngineMode;
  private config: EngineConfig;
  private activeScans: Map<string, AbortController> = new Map();
  constructor(config?: Partial<EngineConfig>) {
    this.config = {
      mode: config?.mode ?? "mock",
      wasmPath: config?.wasmPath,
      cacheEnabled: config?.cacheEnabled ?? true,
      parallelWorkers: config?.parallelWorkers ?? 2,
      debugMode: config?.debugMode ?? false,
    };
    this.mode = this.config.mode;
  }
  async scanAndDecrypt(walletKey: WalletKey, params: ScanParams, onProgress?: (progress: ScanProgress) => void): Promise<ScanResult> {
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const controller = new AbortController();
    this.activeScans.set(scanId, controller);
    try {
      if (this.mode === "mock") {
        return await this.mockScan(walletKey, params, onProgress, controller.signal);
      } else if (this.mode === "wasm") {
        return await this.wasmScan(walletKey, params, onProgress, controller.signal);
      } else {
        throw new Error(`Unsupported engine mode: ${this.mode}`);
      }
    } finally {
      this.activeScans.delete(scanId);
    }
  }
  async scanMultipleKeys(keys: WalletKey[], params: ScanParams, onProgress?: (keyId: string, progress: ScanProgress) => void): Promise<Map<string, ScanResult>> {
    const results = new Map<string, ScanResult>();
    for (const key of keys) {
      const result = await this.scanAndDecrypt(key, params, progress => onProgress?.(key.id, progress));
      results.set(key.id, result);
    }
    return results;
  }
  cancelScan(scanId: string): void {
    const controller = this.activeScans.get(scanId);
    if (controller) {
      controller.abort();
      this.activeScans.delete(scanId);
    }
  }
  cancelAllScans(): void {
    this.activeScans.forEach((controller) => controller.abort());
    this.activeScans.clear();
  }
  // The mockScan below is preserved from your earlier code and returns realistic demo transactions.
  private async mockScan(walletKey: WalletKey, params: ScanParams, onProgress?: (progress: ScanProgress) => void, signal?: AbortSignal): Promise<ScanResult> {
    const startHeight = params.startHeight ?? CONSTANTS.DEFAULT_START_HEIGHT;
    const endHeight = params.endHeight ?? startHeight + 10000;
    const totalBlocks = endHeight - startHeight;
    for (let i = 0; i <= 100; i += 2) {
      if (signal?.aborted) {
        throw new Error("Scan cancelled");
      }
      await this.delay(30);
      onProgress?.({
        current: startHeight + Math.floor((totalBlocks * i) / 100),
        total: endHeight,
        percentage: i,
        blocksPerSecond: 15,
        estimatedTimeRemaining: ((100 - i) * 30) / 1000,
        status: i < 100 ? "scanning" : "complete",
      });
    }
    const transactions = this.generateMockTransactions(walletKey.id, startHeight, params);
    const notes = this.generateMockNotes(transactions);
    return {
      transactions,
      notes,
      lastHeight: endHeight
    };
  }
  private generateMockTransactions(keyId: string, startHeight: number, params: ScanParams): TxRecord[] {
    const count = 15 + Math.floor(Math.random() * 10);
    const now = Math.floor(Date.now() / 1000);
    const transactions: TxRecord[] = [];
    for (let i = 0; i < count; i++) {
      const hoursAgo = Math.floor(Math.random() * 720);
      const timestamp = now - hoursAgo * 3600;
      const direction = Math.random() > 0.5 ? "incoming" : "outgoing";
      const pool = Math.random() > 0.3 ? "orchard" : "sapling";
      const baseAmount = Math.floor(Math.random() * 5e8) + 1e7;
      const amount = direction === "incoming" ? baseAmount : -baseAmount;
      const memos = [
        "Payment received",
        "Invoice #" + Math.floor(Math.random() * 9999),
        "Donation to open source",
        "Freelance work completed",
        "Monthly subscription",
        "Tip for great service",
        "Refund processed",
        "",
        "",
      ];
      const tx: TxRecord = {
        txid: this.generateTxId(),
        height: startHeight + i * 10,
        timestamp,
        pool,
        amount,
        memo: Math.random() > 0.3 ? memos[Math.floor(Math.random() * memos.length)] : undefined,
        direction,
        keyId,
        address: this.generateMockAddress(pool),
        confirmations: Math.floor(Math.random() * 100) + 10,
      };
      transactions.push(tx);
    }
    transactions.sort((a, b) => b.timestamp - a.timestamp);
    return transactions.map(tx => ({ ...tx, risk: assessTransactionRisk(tx, transactions) }));
  }
  private generateMockNotes(transactions: TxRecord[]): ShieldedNote[] {
    return transactions.map((tx, i) => ({
      noteId: `note_${tx.txid}_${i}`,
      txid: tx.txid,
      position: i,
      value: Math.abs(tx.amount),
      memo: tx.memo,
      spent: Math.random() > 0.7,
      spentInTx: Math.random() > 0.5 ? this.generateTxId() : undefined
    }));
  }
  private async wasmScan(walletKey: WalletKey, params: ScanParams, onProgress?: (progress: ScanProgress) => void, signal?: AbortSignal): Promise<ScanResult> {
    throw new Error("WASM mode not yet implemented. Use mock mode for demo.");
  }
  private generateTxId(): string {
    const hex = "0123456789abcdef";
    let txid = "";
    for (let i = 0; i < 64; i++) txid += hex[Math.floor(Math.random() * hex.length)];
    return txid;
  }
  private generateMockAddress(pool: string): string {
    const prefix = pool === "orchard" ? "u1" : pool === "sapling" ? "zs1" : "t1";
    const hex = "0123456789abcdefghijklmnopqrstuvwxyz";
    let addr = prefix;
    for (let i = 0; i < 60; i++) addr += hex[Math.floor(Math.random() * hex.length)];
    return addr;
  }
  private delay(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
  setMode(mode: EngineMode): void { this.mode = mode; this.config.mode = mode; }
  getMode(): EngineMode { return this.mode; }
  getConfig(): EngineConfig { return { ...this.config }; }
  updateConfig(cfg: Partial<EngineConfig>): void { this.config = { ...this.config, ...cfg }; if (cfg.mode) this.mode = cfg.mode; }
  isReady(): boolean { return this.mode !== "wasm" ? true : false; }
}
let engineInstance: ZecreteEngine | null = null;
export function getEngine(config?: Partial<EngineConfig>): ZecreteEngine {
  if (!engineInstance) engineInstance = new ZecreteEngine(config); return engineInstance;
}
export function resetEngine(): void { if (engineInstance) { engineInstance.cancelAllScans(); engineInstance = null; } }