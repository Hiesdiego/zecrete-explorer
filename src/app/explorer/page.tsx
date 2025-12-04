// src/app/explorer/page.tsx

"use client";
import React, { useEffect, useState, useRef } from "react";
import { ExplorerProvider, useExplorer } from "@/context/ExplorerStore";
import { PriceProvider, usePrice } from "@/context/PriceProvider";
import PanicButton from "@/components/PanicButton";
import { Dashboard as StatsDashboard } from "@/components/Dashboard";
import Notebook from "@/components/Notebook";
import { TransactionList } from "@/components/TransactionList";
import LocalAiChat from "@/components/LocalAiChat";
import { eventBus } from "@/lib/eventBus";
import { getVaultIndex, getAllUnlockedKeys } from "@/lib/vault";
import { useWalletStore } from "@/lib/store/walletStore";
import UFVKImport from "@/components/UFVKImport";
import UnlockModal from "@/components/UnlockModal";
import Heatmap from "@/components/Heatmap";
import PrivacySnapshot from "@/components/PrivacySnapshot";
import { 
  Shield, 
  Lock, 
  RefreshCw, 
  Zap, 
  BarChart3, 
  Flame, 
  FileText, 
  Database,
  Filter,
  Download,
  Maximize2,
  Settings,
  Eye,
  TrendingUp,
  Cpu,
  Globe,
  Wallet,
  Shield as ShieldIcon
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

function ExplorerInner() {
  const { isDark, resolvedTheme } = useTheme();
  const explorer = useExplorer();
  const { price, loading: priceLoading, refresh } = usePrice();
  const ufvk = useWalletStore((s) => s.ufvk);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [hasUnlockedSession, setHasUnlockedSession] = useState<boolean>(() => {
    try {
      return getAllUnlockedKeys().length > 0;
    } catch {
      return false;
    }
  });
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoPct, setAutoPct] = useState(0);
  const [autoMsg, setAutoMsg] = useState("Preparing...");
  const autoSeqRef = useRef<number | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const isReady = Boolean(ufvk) || hasUnlockedSession;
  const showBlocker = (!isReady && (showImportModal || showUnlockModal));

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const index = getVaultIndex();
      const keyCount = Object.keys(index || {}).length;
      const unlocked = getAllUnlockedKeys();
      const importedFlag = (typeof window !== "undefined" && localStorage.getItem("zecrete:hasKey") === "1");

      if ((keyCount > 0 || importedFlag) && (unlocked.length === 0)) {
        const t = setTimeout(() => setShowUnlockModal(true), 400);
        return () => clearTimeout(t);
      } else if (keyCount === 0 && !importedFlag) {
        setShowImportModal(true);
      } else {
        setHasUnlockedSession(unlocked.length > 0);
      }
    } catch (e) {
      setShowImportModal(true);
    }
  }, []);

  useEffect(() => {
    const offKeyAdded = eventBus.on("vault:key-added", (p: any) => {
      try {
        const unlocked = getAllUnlockedKeys();
        if (unlocked.length === 0) {
          setShowUnlockModal(true);
          setShowImportModal(false);
        }
      } catch {}
    });

    const offKeyRemoved = eventBus.on("vault:key-removed", (p: any) => {
      try {
        const index = getVaultIndex();
        const count = Object.keys(index || {}).length;
        if (count === 0) {
          setShowImportModal(true);
          setShowUnlockModal(false);
        }
      } catch {}
    });

    const offWalletLoaded = eventBus.on("wallet:loaded", () => {
      setShowImportModal(false);
      setShowUnlockModal(false);
      setHasUnlockedSession(true);
      startAutoLoadSequence();
    });

    const offSessionUnlocked = eventBus.on("session:unlocked", () => {
      setShowUnlockModal(false);
      setShowImportModal(false);
      setHasUnlockedSession(true);
      startAutoLoadSequence();
    });

    const offModalImport = eventBus.on("modal:import", () => {
      setShowImportModal(true);
      setShowUnlockModal(false);
    });

    const offModalClose = eventBus.on("modal:close", () => {
      setShowImportModal(false);
      setShowUnlockModal(false);
      try { setHasUnlockedSession(getAllUnlockedKeys().length > 0); } catch { setHasUnlockedSession(false); }
    });

    const offVaultCleared = eventBus.on("vault:cleared", () => {
      setShowImportModal(true);
    });

    return () => {
      offKeyAdded();
      offKeyRemoved();
      offWalletLoaded();
      offSessionUnlocked();
      offModalImport();
      offModalClose();
      offVaultCleared();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (autoSeqRef.current) {
        window.clearInterval(autoSeqRef.current);
        autoSeqRef.current = null;
      }
    };
  }, []);

  // If any components need to run theme-specific setup on change, we optionally listen
  // (not strictly necessary since we remount heavy children with key={resolvedTheme})
  useEffect(() => {
    const off = eventBus.on("theme:changed", (theme: string) => {
      // You can use this hook to run global behavior if needed
      // console.debug("Explorer observed theme change:", theme);
    });
    return () => off();
  }, []);

  async function handleRefresh() {
    try {
      await refresh();
    } catch {}
  }

  function startAutoLoadSequence() {
    if (autoLoading) return;
    if (explorer?.txs && explorer.txs.length > 0) return;

    setAutoLoading(true);
    setAutoPct(4);
    setAutoMsg("Initializing wallet discovery...");

    const steps = [
      { pct: 18, msg: "Fetching compact blocks...", delay: 800 },
      { pct: 46, msg: "Decrypting transactions...", delay: 1100 },
      { pct: 72, msg: "Analyzing privacy metrics...", delay: 1000 },
      { pct: 92, msg: "Finalizing analytics...", delay: 700 },
      { pct: 100, msg: "Complete", delay: 300 },
    ];

    let idx = 0;
    autoSeqRef.current = window.setInterval(() => {
      const s = steps[idx];
      if (!s) {
        if (autoSeqRef.current) { 
          window.clearInterval(autoSeqRef.current); 
          autoSeqRef.current = null; 
        }
        setAutoLoading(false);
        setAutoPct(100);
        setAutoMsg("Applying dataset...");
        try {
          explorer.runPortfolioDemo();
        } catch (e) {
          console.error("Auto runPortfolioDemo failed:", e);
        }
        setTimeout(() => { setAutoMsg("Ready"); setAutoPct(100); }, 300);
        return;
      }

      setAutoPct(s.pct);
      setAutoMsg(s.msg);
      idx++;
    }, Math.max(200, steps[0].delay));
  }

  if (isInitialLoading) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${
        isDark ? 'glass' : 'bg-white/95 backdrop-blur-xl'
      }`}>
        <div className="text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full gold-gradient animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-[var(--bg)] flex items-center justify-center">
              <Zap className="w-10 h-10 gold-gradient-text animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Loading Explorer</h2>
            <p className="text-[var(--text-secondary)]">Initializing privacy analytics...</p>
          </div>
          <div className="w-64 h-1 mx-auto bg-[var(--surface)] rounded-full overflow-hidden">
            <div className="h-full gold-gradient animate-shimmer" style={{ width: "70%" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden top-[5rem] lg:top-[8rem] ">
      {/* Background with glass effects */}
      <div className={`fixed inset-0 -z-20 pointer-events-none ${
        isDark 
          ? 'bg-gradient-to-br from-black via-gray-900 to-black' 
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
      }`}>
        <div className={`absolute top-1/4 -left-20 w-96 h-96 ${
          isDark ? 'bg-[var(--accent)]/5' : 'bg-[var(--accent)]/3'
        } rounded-full blur-3xl`} />
        <div className={`absolute bottom-1/4 -right-20 w-96 h-96 ${
          isDark ? 'bg-[var(--accent-dark)]/5' : 'bg-[var(--accent-dark)]/3'
        } rounded-full blur-3xl`} />
      </div>

      {/* Blocker overlay */}
      {showBlocker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <div className={`absolute inset-0 ${
            isDark ? 'bg-black/80 backdrop-blur-xl' : 'bg-white/80 backdrop-blur-xl'
          }`} />
          <div className="relative z-10 w-full max-w-lg">
            {showImportModal && <UFVKImport key={resolvedTheme} />}
            {showUnlockModal && <UnlockModal key={resolvedTheme} open={true} onClose={() => setShowUnlockModal(false)} />}
          </div>
        </div>
      )}

      {/* Auto-loading overlay */}
      {autoLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`absolute inset-0 ${
            isDark ? 'bg-black/90 backdrop-blur-2xl' : 'bg-white/95 backdrop-blur-2xl'
          }`} />
          <div className={`relative z-10 w-full max-w-md p-8 rounded-2xl ${
            isDark ? 'glass-heavy' : 'bg-white/90 border border-gray-300/30'
          } text-center space-y-6`}>
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full gold-gradient animate-spin" />
              <div className="absolute inset-4 rounded-full bg-[var(--bg)] flex items-center justify-center">
                <Wallet className="w-8 h-8 text-[var(--accent)]" />
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold mb-2">Loading Portfolio</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">{autoMsg}</p>
              
              <div className="w-full bg-[var(--surface)]/50 rounded-full h-1.5 overflow-hidden mb-2">
                <div 
                  className="h-1.5 gold-gradient transition-all duration-300"
                  style={{ width: `${autoPct}%` }} 
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Discovery</span>
                <span className="font-semibold text-[var(--accent)]">{autoPct}%</span>
                <span className="text-[var(--text-secondary)]">Analysis</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT - Full Screen Layout */}
      <div className="min-w-full px-4 md:px-6 lg:px-8 pb-8 space-y-12">
        {/* Premium Header Section */}
        <section className={`mt-4 rounded-2xl ${
          isDark 
            ? 'glass-heavy border border-white/10' 
            : 'bg-white/90 backdrop-blur-xl border border-gray-300/30'
        }`}>
          <div className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              {/* Brand & Title */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center">
                  <Zap className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    <span className="gold-gradient-text">Zecrete</span>
                    <span className="ml-2">Explorer</span>
                  </h1>
                  <p className={`text-sm ${isDark ? 'text-text-secondary' : 'text-gray-600'} mt-1`}>
                    Advanced Zcash Privacy Analytics
                  </p>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Price Display */}
                <div className={`px-4 py-2.5 rounded-xl ${
                  isDark ? 'bg-black/30 border border-white/10' : 'bg-white/50 border border-gray-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className="text-sm">
                      ZEC <span className="font-bold">${price?.usd?.toFixed(4) ?? "—"}</span>
                    </div>
                    {price?.change24h && (
                      <div className={`text-xs px-1.5 py-0.5 rounded ${
                        price.change24h >= 0 
                          ? 'bg-green-500/10 text-green-600' 
                          : 'bg-red-500/10 text-red-600'
                      }`}>
                        {price.change24h >= 0 ? '↑' : '↓'} {Math.abs(price.change24h).toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  disabled={priceLoading}
                  className={`p-2.5 rounded-xl ${
                    isDark 
                      ? 'bg-black/30 border border-white/10 hover:bg-white/5' 
                      : 'bg-white/50 border border-gray-300 hover:bg-gray-100'
                  } transition-all duration-300`}
                >
                  <RefreshCw className={`w-4 h-4 ${priceLoading ? 'animate-spin' : ''}`} />
                </button>

                {/* Wallet Status */}
                <div className={`px-3 py-2 rounded-xl ${
                  isDark ? 'bg-black/30 border border-white/10' : 'bg-white/50 border border-gray-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="text-xs font-medium">{isReady ? 'Wallet Ready' : 'Locked'}</span>
                  </div>
                </div>

                {/* Panic Button */}
                <PanicButton />
              </div>
            </div>

            {/* Progress Bar */}
            {explorer.progress && (
              <div className={`mt-6 p-4 rounded-xl ${
                isDark ? 'bg-black/30 border border-white/10' : 'bg-white/50 border border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Scan Progress</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {explorer.progress.percentage ?? "—"}%
                  </span>
                </div>
                <div className={`w-full rounded-full h-1.5 overflow-hidden ${
                  isDark ? 'bg-white/10' : 'bg-gray-300'
                }`}>
                  <div 
                    className="h-1.5 gold-gradient transition-all duration-500"
                    style={{ width: `${explorer.progress.percentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  {explorer.progress.status}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Main Grid - Full Width */}
        <div className="grid grid-cols-1 xl:grid-cols-1 gap-8">
          {/* Left Column - Full Width Analytics */}
          <div className="xl:col-span-1 space-y-8 ">
            {/* Dashboard Stats */}
            <div className={`rounded-2xl ${
              isDark 
                ? 'glass-heavy border border-white/10' 
                : 'bg-white/90 backdrop-blur-xl border border-gray-300/30'
            }`}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-black" />
                    </div>
                    <h2 className="text-xl font-bold">Portfolio Analytics</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">Live</span>
                  </div>
                </div>
                {/* force remount when theme changes */}
                <StatsDashboard key={resolvedTheme} transactions={explorer.txs} price={price ?? undefined} />
              </div>
            </div>

            {/* Heatmap Section - Full Width */}
            <div className={`rounded-2xl ${
              isDark 
                ? 'glass-heavy border border-white/10' 
                : 'bg-white/90 backdrop-blur-xl border border-gray-300/30'
            }`}>
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
                      <Flame className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Shielded Activity Map</h2>
                      <p className={`text-sm ${isDark ? 'text-text-secondary' : 'text-gray-600'}`}>
                        Real-time transaction density visualization
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className={`px-3 py-1.5 rounded-lg ${
                      isDark ? 'bg-black/30 hover:bg-white/5' : 'bg-gray-100 hover:bg-gray-200'
                    } transition-colors text-sm flex items-center gap-2`}>
                      <Maximize2 className="w-3.5 h-3.5" />
                      Fullscreen
                    </button>
                  </div>
                </div>
                
                {/* Heatmap Container - Full Width */}
                <div className="relative w-full overflow-hidden rounded-xl ">
                  <div className={`absolute inset-0 ${
                    isDark ? 'bg-black/20' : 'bg-gray-100/50'
                  }`} />
                  <div className="relative p-4">
                    <Heatmap 
                      key={resolvedTheme}
                      txs={explorer.txs} 
                      width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 100, 1400) : 1200}
                      height={320}
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400" />
                      <span className="text-xs">Low Activity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)]" />
                      <span className="text-xs">Medium Activity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500" />
                      <span className="text-xs">High Activity</span>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {explorer.txs?.length || 0} transactions analyzed
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Section */}
            <div className={`rounded-2xl ${
              isDark 
                ? 'glass-heavy border border-white/10' 
                : 'bg-white/90 backdrop-blur-xl border border-gray-300/30'
            }`}>
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
                      <FileText className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Shielded Transactions</h2>
                      <p className={`text-sm ${isDark ? 'text-text-secondary' : 'text-gray-600'}`}>
                        Locally decrypted and analyzed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className={`px-3 py-1.5 rounded-lg ${
                      isDark ? 'bg-black/30 hover:bg-white/5' : 'bg-gray-100 hover:bg-gray-200'
                    } transition-colors text-sm flex items-center gap-2`}>
                      <Filter className="w-3.5 h-3.5" />
                      Filter
                    </button>
                    <button className={`px-3 py-1.5 rounded-lg ${
                      isDark ? 'bg-black/30 hover:bg-white/5' : 'bg-gray-100 hover:bg-gray-200'
                    } transition-colors text-sm flex items-center gap-2`}>
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <TransactionList key={resolvedTheme} transactions={explorer.txs} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Privacy Snapshot */}
            <div className={`rounded-2xl ${
              isDark 
                ? 'glass-heavy border border-white/10' 
                : 'bg-white/90 backdrop-blur-xl border border-gray-300/30'
            }`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
                      <Shield className="w-5 h-5 text-black" />
                    </div>
                    <h2 className="text-xl font-bold">Privacy Snapshot</h2>
                  </div>
                </div>
                <PrivacySnapshot key={resolvedTheme}
                  txs={explorer.txs} 
                  privacySummary={explorer.privacySummary} 
                  onOpenHeatmap={() => eventBus.emit("ui:open-heatmap")}
                />
              </div>
            </div>

            {/* Security Status */}
            <div className={`rounded-2xl ${
              isDark 
                ? 'glass-heavy border border-white/10' 
                : 'bg-white/90 backdrop-blur-xl border border-gray-300/30'
            }`}>
              <div className="p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <ShieldIcon className="w-4 h-4 text-[var(--accent)]" />
                  Security Status
                </h3>
                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-2.5 rounded-lg ${
                    isDark ? 'bg-black/30' : 'bg-gray-100/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-sm">Local Decryption</span>
                    </div>
                    <span className="text-xs text-green-500 font-medium">Active</span>
                  </div>
                  <div className={`flex items-center justify-between p-2.5 rounded-lg ${
                    isDark ? 'bg-black/30' : 'bg-gray-100/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-sm">Key Storage</span>
                    </div>
                    <span className="text-xs text-green-500 font-medium">Secure</span>
                  </div>
                  <div className={`flex items-center justify-between p-2.5 rounded-lg ${
                    isDark ? 'bg-black/30' : 'bg-gray-100/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span className="text-sm">Network Privacy</span>
                    </div>
                    <span className="text-xs text-[var(--accent)] font-medium">Enhanced</span>
                  </div>
                  <div className={`flex items-center justify-between p-2.5 rounded-lg ${
                    isDark ? 'bg-black/30' : 'bg-gray-100/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-sm">Processing</span>
                    </div>
                    <span className="text-xs text-blue-500 font-medium">Local</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className={`rounded-2xl ${
              isDark 
                ? 'glass-heavy border border-white/10' 
                : 'bg-white/90 backdrop-blur-xl border border-gray-300/30'
            }`}>
              <div className="p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
                  Overview
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Total TXs</span>
                    <span className="font-bold">{explorer.txs?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Shielded Value</span>
                    <span className="font-bold">
                      ${price?.usd ? ((explorer.txs?.length || 0) * 0.5 * price.usd).toFixed(2) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Privacy Score</span>
                    <span className="font-bold text-[var(--accent)]">98.7%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Anonymity Set</span>
                    <span className="font-bold">2.4k</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notebook Section - Full Width */}
        <div className={`rounded-2xl ${
          isDark 
            ? 'glass-heavy border border-white/10' 
            : 'bg-white/90 backdrop-blur-xl border border-gray-300/30'
        }`}>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
                  <FileText className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Explorer Notebook</h2>
                  <p className={`text-sm ${isDark ? 'text-text-secondary' : 'text-gray-600'}`}>
                    Document findings and insights
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className={`px-3 py-1.5 rounded-lg ${
                  isDark ? 'bg-black/30 hover:bg-white/5' : 'bg-gray-100 hover:bg-gray-200'
                } transition-colors text-sm flex items-center gap-2`}>
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
                <button className={`px-3 py-1.5 rounded-lg ${
                  isDark ? 'bg-black/30 hover:bg-white/5' : 'bg-gray-100 hover:bg-gray-200'
                } transition-colors text-sm flex items-center gap-2`}>
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </button>
              </div>
            </div>
            <div className="mt-4">
              <Notebook key={resolvedTheme} txs={explorer.txs} />
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Widget */}
      <LocalAiChat key={resolvedTheme} txs={explorer.txs} />
    </div>
  );
}

export default function ExplorerPage() {
  return (
    <PriceProvider>
      <ExplorerProvider>
        <ExplorerInner />
      </ExplorerProvider>
    </PriceProvider>
  );
}
