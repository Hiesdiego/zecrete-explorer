"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  localAiAnswer,
  localAiAnswerStream,
  listAiRules,
  addAiRule,
  removeAiRule,
  exportAuditCSV,
  exportAuditHTML,
} from "@/lib/agent/local-ai";
import type { TxRecord } from "@/lib/types";
import { usePrice } from "@/context/PriceProvider";
import { isGhostMode, obfuscateAmount } from "@/lib/privacy";
import { eventBus } from "@/lib/eventBus";
import {
  Bot,
  Send,
  X,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Copy,
  Download,
  Printer,
  Filter,
  Shield,
  AlertTriangle,
  TrendingUp,
  Users,
  RefreshCw,
  Plus,
  Trash2,
  MessageSquare,
  Brain,
  Zap,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Loader2,
  Sparkles,
  BookOpen,
  BarChart3,
  FileText,
} from "lucide-react";

// Move quick actions array outside component to avoid re-renders
const QUICK_ACTIONS = [
  {
    icon: AlertTriangle,
    label: "Detect Anomalies",
    query: "Find anomalies in the last 30 days",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Shield,
    label: "Privacy Snapshot",
    query: "Privacy snapshot for the last 90 days",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Users,
    label: "Top Counterparties",
    query: "Top counterparties by volume last 30 days",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: RefreshCw,
    label: "Recurring Payments",
    query: "Summarize monthly recurring payments",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: BarChart3,
    label: "Volume Analysis",
    query: "Show transaction volume trends",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: FileText,
    label: "Audit Report",
    query: "Generate comprehensive audit report",
    color: "from-rose-500 to-red-500",
  },
];

// Helper functions outside component
function chunkSanitize(s: string) {
  return String(s).replace(/\s+$/g, "");
}

function buildMetaFromResp(resp: any) {
  const sources = (resp.sources || []).map((s: any) =>
    s?.txid ? s.txid : s?.txid ?? ""
  );
  return {
    sources,
    suggestions: resp.suggestions ?? [],
    chartData: resp.chartData ?? null,
    tableData: resp.tableData ?? null,
    auditNotes: resp.auditNotes ?? null,
    confidence: resp.confidence ?? 0,
    summary: resp.summary ?? null,
    top: resp.top ?? null,
    recurring: resp.recurring ?? null,
    privacySummary: resp.privacySummary ?? null,
  };
}

export default function LocalAiChat({ txs }: { txs: TxRecord[] }) {
  // All hooks must be called unconditionally at the top level
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem("zecrete:ai:pinned") === "1";
    } catch {
      return false;
    }
  });
  const [pinned, setPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem("zecrete:ai:pinned") === "1";
    } catch {
      return false;
    }
  });
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<
    { id: string; role: "user" | "assistant"; text: string; meta?: any }[]
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("zecrete:ai:history:v2") || "[]");
    } catch {
      return [];
    }
  });
  const [q, setQ] = useState("");
  const [thinking, setThinking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [rules, setRules] = useState(() => listAiRules());
  const [ruleForm, setRuleForm] = useState({
    name: "",
    pattern: "",
    field: "memo",
    severity: "high",
  });
  const [ghost, setGhost] = useState<boolean>(() => {
    try {
      return isGhostMode();
    } catch {
      return false;
    }
  });
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [showRules, setShowRules] = useState(false);

  // Mobile detection & top offset (so the panel doesn't overlap a fixed root header)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 640;
  });

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= 640);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // When mobile, we prefer the bottom-sheet / full mode experience
  const effectiveExpanded = isMobile ? true : expanded;

  const { price } = usePrice();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setGhost(isGhostMode());
    const off = eventBus.on("ui:ghost", (p: any) => setGhost(Boolean(p?.on ?? p)));
    return () => off();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("zecrete:ai:history:v2", JSON.stringify(history));
    } catch {}
    scrollRef.current?.scrollTo({
      top: scrollRef.current?.scrollHeight ?? 0,
      behavior: "smooth",
    });
  }, [history]);

  useEffect(() => {
    (async () => {
      setConnected(false);
      try {
        await new Promise((r) => setTimeout(r, 220));
        setConnected(true);
        eventBus.emit("toast", {
          type: "success",
          text: "Local AI initialized",
        });
      } catch {
        setConnected(false);
        eventBus.emit("toast", {
          type: "error",
          text: "Local AI failed to initialize",
        });
      }
    })();
  }, []);

  // Helper functions inside component (useCallbacks for optimization)
  const prettyZecFromSats = useCallback((zats: number) => {
    return `${(zats / 1e8).toFixed(6)} ZEC`;
  }, []);

  const pushUser = useCallback((text: string) => {
    const id = `q_${Date.now()}`;
    setHistory((h) => [...h, { id, role: "user", text }]);
    scrollToBottom();
  }, []);

  const pushAssistant = useCallback((text: string, meta?: any) => {
    const id = `a_${Date.now()}`;
    setHistory((h) => [...h, { id, role: "assistant", text, meta }]);
    scrollToBottom();
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(
      () =>
        scrollRef.current?.scrollTo({
          top: scrollRef.current?.scrollHeight ?? 0,
          behavior: "smooth",
        }),
      80
    );
  }, []);

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim() || !connected) {
        eventBus.emit("toast", {
          type: "warning",
          text: "AI is not ready or question is empty",
        });
        return;
      }

      pushUser(question);
      setThinking(true);

      const placeholderId = `a_placeholder_${Date.now()}`;
      setHistory((h) => [
        ...h,
        { id: placeholderId, role: "assistant", text: "...", meta: { streaming: true } },
      ]);
      scrollToBottom();

      try {
        if (streamingEnabled) {
          let lastText = "";
          const onChunk = async (chunk: string) => {
            lastText = chunk;
            setHistory((h) =>
              h.map((item) => (item.id === placeholderId ? { ...item, text: chunk } : item))
            );
            scrollToBottom();
          };
          const final = await localAiAnswerStream({ question, context: txs }, { price: price?.usd }, onChunk);
          setHistory((h) =>
            h.map((item) =>
              item.id === placeholderId
                ? {
                    ...item,
                    text: chunkSanitize(lastText || final.answer || ""),
                    meta: buildMetaFromResp(final),
                  }
                : item
            )
          );
        } else {
          const resp = await localAiAnswer({ question, context: txs }, { price: price?.usd });
          setHistory((h) =>
            h.map((item) =>
              item.id === placeholderId
                ? {
                    ...item,
                    text: chunkSanitize(resp.answer || ""),
                    meta: buildMetaFromResp(resp),
                  }
                : item
            )
          );
        }
      } catch (e: any) {
        setHistory((h) =>
          h.map((item) =>
            item.id === placeholderId
              ? {
                  ...item,
                  text: `Error: ${String(e?.message || e)}`,
                  meta: {},
                }
              : item
          )
        );
        eventBus.emit("toast", { type: "error", text: "AI analysis failed" });
      } finally {
        setThinking(false);
      }
    },
    [connected, streamingEnabled, txs, price?.usd, pushUser]
  );

  // Quick action handler
  const handleQuickAction = useCallback(
    (query: string) => {
      setQ(query);
      ask(query);
    },
    [ask]
  );

  // Rule management
  const refreshRules = useCallback(() => {
    setRules(listAiRules());
  }, []);

  const handleAddRule = useCallback(() => {
    try {
      if (!ruleForm.name || !ruleForm.pattern) {
        eventBus.emit("toast", { type: "warning", text: "Name and pattern required" });
        return;
      }
      addAiRule({
        name: ruleForm.name,
        pattern: ruleForm.pattern,
        field: ruleForm.field as any,
        severity: ruleForm.severity as any,
        description: "",
      });
      setRuleForm({ name: "", pattern: "", field: "memo", severity: "high" });
      refreshRules();
      eventBus.emit("toast", { type: "success", text: "Rule added successfully" });
    } catch {
      eventBus.emit("toast", { type: "error", text: "Failed to add rule" });
    }
  }, [ruleForm, refreshRules]);

  const handleRemoveRule = useCallback(
    (id: string) => {
      removeAiRule(id);
      refreshRules();
      eventBus.emit("toast", { type: "success", text: "Rule removed" });
    },
    [refreshRules]
  );

  // Export functions
  const latestMeta = useCallback(() => {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === "assistant" && history[i].meta) return history[i].meta;
    }
    return null;
  }, [history]);

  const exportCSVfromMeta = useCallback(() => {
    const meta = latestMeta();
    if (!meta || !meta.summary) {
      eventBus.emit("toast", { type: "warning", text: "No analysis available to export" });
      return;
    }
    const csv = exportAuditCSV({
      summary: meta.summary,
      anomalies: meta.tableData ?? [],
      top: meta.chartData ?? meta.top ?? [],
      recurring: meta.recurring ?? [],
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zecrete_audit_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    eventBus.emit("toast", { type: "success", text: "CSV exported successfully" });
  }, [latestMeta]);

  const exportPrintableFromMeta = useCallback(() => {
    const meta = latestMeta();
    if (!meta || !meta.summary) {
      eventBus.emit("toast", { type: "warning", text: "No analysis available to export" });
      return;
    }
    const html = exportAuditHTML({
      title: "Zecrete Privacy Audit Report",
      summary: meta.summary,
      price: price?.usd ?? null,
      anomalies: meta.tableData ?? [],
      top: (meta.chartData ?? meta.top ?? []).map((t: any) => ({
        label: t.label,
        total: t.value ? t.value * 1e8 : t.total,
      })),
      recurring: meta.recurring ?? [],
      privacyScore: meta.privacySummary?.overall ?? null,
    });
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      eventBus.emit("toast", { type: "warning", text: "Popup blocked. Please allow popups to export." });
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      try {
        w.print();
      } catch {}
    }, 300);
  }, [latestMeta, price?.usd]);

  // Clear chat history
  const clearHistory = useCallback(() => {
    if (window.confirm("Clear all chat history? This cannot be undone.")) {
      setHistory([]);
      eventBus.emit("toast", { type: "success", text: "Chat history cleared" });
    }
  }, []);

  // Toggle pin
  const togglePin = useCallback(() => {
    const newPinned = !pinned;
    setPinned(newPinned);
    try {
      localStorage.setItem("zecrete:ai:pinned", newPinned ? "1" : "0");
    } catch {}
    eventBus.emit("toast", {
      type: "success",
      text: newPinned ? "Chat pinned" : "Chat unpinned",
    });
  }, [pinned]);

  // Handle input submission
  const handleSubmit = useCallback(() => {
    if (connected && q.trim()) {
      ask(q);
      setQ("");
    }
  }, [connected, q, ask]);

  // Handle Enter key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey && connected) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [connected, handleSubmit]
  );

  // Container classes - fixed when expanded, floating when closed/minimized
  // We'll compute container class/style depending on mobile vs desktop
  // Provide a top offset so it doesn't overlap a site header (header height ~ 4-8rem)
  const headerOffsetPx = 72; // safe offset to keep below header (adjustable)
  const containerStyle: React.CSSProperties | undefined = isMobile
    ? {
        position: "fixed",
        top: `${headerOffsetPx}px`,
        left: 0,
        right: 0,
        bottom: 16,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingLeft: 16,
        paddingRight: 16,
      }
    : undefined;

  const containerClass = isMobile
    ? "z-50"
    : effectiveExpanded
    ? "fixed inset-6 z-50 flex items-center justify-center transition-all duration-300"
    : "fixed bottom-24 right-6 z-50 transition-all duration-300";

  // Inner panel sizing
  const panelSizeClass = isMobile
    ? "w-full h-[calc(100vh-76px)] max-w-none rounded-t-2xl glass-heavy border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col"
    : effectiveExpanded
    ? "w-[calc(100vw-48px)] h-[calc(100vh-48px)] max-w-[1200px] max-h-[900px] glass-heavy rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col"
    : "w-[420px] h-[600px] glass-heavy rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col";

  return (
    <>
      {/* Floating AI Button (when closed) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Open AI Chat"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] rounded-full blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-16 h-16 rounded-full gold-gradient flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
              <Bot className="w-7 h-7 text-black" />
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-[var(--bg)] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>
          </div>
        </button>
      )}

      {/* AI Chat Window */}
      {open && (
        <div className={containerClass} style={containerStyle}>
          <div className={panelSizeClass}>
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--accent)]/10 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
                    <Bot className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Privacy AI Assistant</h3>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 text-xs ${connected ? "text-green-400" : "text-amber-400"}`}>
                        <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
                        {connected ? "Ready" : "Initializing..."}
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">• Local Processing • v3.0</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStreamingEnabled(!streamingEnabled)}
                    className={`p-2 rounded-lg transition-colors ${streamingEnabled ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "hover:bg-[var(--surface)]"}`}
                    title="Toggle streaming"
                    aria-pressed={streamingEnabled}
                  >
                    <Zap className="w-4 h-4" />
                  </button>

                  {/* On mobile, hide expand/minimize controls and always use bottom-sheet full UI */}
                  {!isMobile && (
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
                      title={expanded ? "Minimize" : "Expand"}
                    >
                      {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                  )}

                  <button
                    onClick={togglePin}
                    className={`p-2 rounded-lg transition-colors ${pinned ? "bg-[var(--accent)] text-black" : "hover:bg-[var(--surface)]"}`}
                    title={pinned ? "Unpin chat" : "Pin chat"}
                  >
                    {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                    title="Close chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            {showQuickActions && (
              <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)]/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-sm font-medium">Quick Analysis</span>
                  </div>
                  <button onClick={() => setShowQuickActions(false)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]">
                    Hide
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {QUICK_ACTIONS.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickAction(action.query)}
                      disabled={!connected || thinking}
                      className="group relative overflow-hidden p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface)]/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                          <action.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-medium text-left">{action.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat History */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-[var(--surface)]/20">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Brain className="w-16 h-16 mb-4 text-[var(--text-secondary)] opacity-30" />
                  <h4 className="font-semibold mb-2">Ask About Your Transactions</h4>
                  <p className="text-sm text-[var(--text-secondary)] max-w-xs">
                    Ask questions about your Zcash transactions, privacy analysis, or request audit reports.
                  </p>
                </div>
              ) : (
                history.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${message.role === "user" ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] text-black" : "glass border border-[var(--border)]"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${message.role === "user" ? "bg-black/20" : "bg-gradient-to-r from-[var(--accent)]/20 to-transparent"}`}>
                          {message.role === "user" ? <span className="text-xs font-bold">You</span> : <Bot className="w-3 h-3 text-[var(--accent)]" />}
                        </div>
                        <span className="text-xs opacity-70">
                          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm">
                        {message.meta?.streaming ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Analyzing...</span>
                          </div>
                        ) : (
                          message.text
                        )}
                      </div>

                      {/* Meta information for assistant messages */}
                      {message.role === "assistant" && message.meta && !message.meta.streaming && (
                        <div className="mt-3 space-y-2">
                          {message.meta.chartData && message.meta.chartData.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs text-[var(--text-secondary)]">Key Metrics:</div>
                              {message.meta.chartData.slice(0, 3).map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span>{item.label}</span>
                                  <span className="font-semibold">{ghost ? "••• ZEC" : `${item.value.toFixed(4)} ZEC`}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {message.meta.sources && message.meta.sources.length > 0 && (
                            <div className="text-xs text-[var(--text-secondary)]">
                              Sources: {message.meta.sources.length} transactions
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {thinking && (
                <div className="flex justify-start">
                  <div className="glass rounded-2xl p-4 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[var(--accent)]/20 to-transparent flex items-center justify-center">
                        <Bot className="w-3 h-3 text-[var(--accent)]" />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing your request...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-glass)]">
              <div className="flex gap-2 mb-3">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your transactions..."
                  className="flex-1 p-3 rounded-xl glass border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  disabled={!connected || thinking}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!connected || thinking || !q.trim()}
                  className="gold-gradient w-12 h-12 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                >
                  <Send className="w-5 h-5 text-black" />
                </button>
              </div>

              {/* Controls Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowQuickActions(!showQuickActions)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] flex items-center gap-1">
                    {showQuickActions ? "Hide" : "Show"} Quick Actions
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  <button onClick={() => setShowRules(!showRules)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] flex items-center gap-1">
                    {showRules ? "Hide" : "Show"} Rules
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={exportCSVfromMeta} className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass hover:bg-[var(--surface)] text-sm" title="Export CSV">
                    <Download className="w-3 h-3" />
                    <span className="hidden sm:inline">CSV</span>
                  </button>

                  <button onClick={exportPrintableFromMeta} className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass hover:bg-[var(--surface)] text-sm" title="Export PDF">
                    <Printer className="w-3 h-3" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>

                  <button onClick={clearHistory} className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass hover:bg-red-500/10 text-red-400 text-sm" title="Clear history">
                    <Trash2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                </div>
              </div>

              {/* Rules Panel */}
              {showRules && (
                <div className="mt-4 p-4 rounded-xl glass border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-[var(--accent)]" />
                      <span className="font-medium">Audit Rules</span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">{rules.length} active rules</span>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input placeholder="Rule name" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} className="p-2 rounded-lg glass border border-[var(--border)] text-sm" />
                      <input placeholder="Pattern (regex)" value={ruleForm.pattern} onChange={(e) => setRuleForm({ ...ruleForm, pattern: e.target.value })} className="p-2 rounded-lg glass border border-[var(--border)] text-sm" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select value={ruleForm.field} onChange={(e) => setRuleForm({ ...ruleForm, field: e.target.value as any })} className="p-2 rounded-lg glass border border-[var(--border)] text-sm">
                        <option value="memo">Memo</option>
                        <option value="address">Address</option>
                        <option value="txid">Transaction ID</option>
                      </select>

                      <select value={ruleForm.severity} onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value as any })} className="p-2 rounded-lg glass border border-[var(--border)] text-sm">
                        <option value="high">High</option>
                        <option value="med">Medium</option>
                        <option value="low">Low</option>
                      </select>

                      <button onClick={handleAddRule} className="flex items-center justify-center gap-2 p-2 rounded-lg gold-gradient text-black font-medium text-sm">
                        <Plus className="w-4 h-4" />
                        Add Rule
                      </button>
                    </div>

                    {rules.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {rules.map((rule) => (
                          <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface)]">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{rule.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${rule.severity === "high" ? "bg-red-500/10 text-red-400" : rule.severity === "med" ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-400"}`}>{rule.severity}</span>
                              </div>
                              <div className="text-xs text-[var(--text-secondary)] font-mono">/{rule.pattern}/ → {rule.field}</div>
                            </div>
                            <button onClick={() => handleRemoveRule(rule.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Status Bar */}
            <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
                <span>{connected ? "Local AI Active" : "Connecting..."}</span>
                <span className="hidden sm:inline">• {ghost ? "Ghost Mode Enabled" : "Normal Mode"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{history.length} messages</span>
                {streamingEnabled && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Streaming
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}