// src/components/UnlockModal.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { eventBus } from "@/lib/eventBus";
import { getVaultIndex, unlockWalletKey, unlockSession } from "@/lib/vault";
import { useWalletStore } from "@/lib/store/walletStore";
import {
  Lock,
  Key,
  Shield,
  Clock,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  ChevronRight,
  Check,
  Database,
  Globe,
  Terminal,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function UnlockModal({
  open,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const { isDark } = useTheme();
  const [keys, setKeys] = useState<Record<string, any> | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [duration, setDuration] = useState<number | "persistent">(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotHint, setShowForgotHint] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const setUFVKInStore = useWalletStore((s) => s.setUFVK);

  function reloadKeys(preferLast = true) {
    try {
      const idx = getVaultIndex() || {};
      setKeys(idx);
      const first = Object.keys(idx || {})[0] ?? null;

      if (preferLast && typeof window !== "undefined") {
        try {
          const last = localStorage.getItem("zecrete:lastKeyId");
          if (last && idx && idx[last]) {
            setSelectedKeyId(last);
            return;
          }
        } catch {}
      }
      setSelectedKeyId(first);
    } catch (e) {
      setKeys({});
      setSelectedKeyId(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    reloadKeys(true);

    const offAdd = eventBus.on("vault:key-added", (p: any) => {
      reloadKeys(false);
      try {
        if (p?.keyId) setSelectedKeyId(p.keyId);
      } catch {}
    });
    const offRemove = eventBus.on("vault:key-removed", () => {
      reloadKeys(true);
    });

    return () => {
      offAdd();
      offRemove();
    };
  }, [open]);

  const keyList = useMemo(() => {
    if (!keys) return [];
    return Object.entries(keys).map(([id, meta]) => ({ id, meta }));
  }, [keys]);

  // map friendly label for duration (used in right-side panel)
  function durationToLabel(d: number | "persistent") {
    if (d === "persistent") return "Keep (persistent)";
    if (d >= 60) return `${d / 60}h`;
    return `${d}m`;
  }

  // Convert selected duration (minutes) to seconds before passing to unlockSession
  function computeDurationSeconds(d: number | "persistent") {
    if (d === "persistent") {
      return 60 * 60 * 24 * 365 * 10; // 10 years in seconds
    }
    // UI values are in minutes (10, 30, 60) — convert to seconds
    return Number(d) * 60;
  }

  async function handleUnlock(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!selectedKeyId) return setError("Select a key to unlock.");
    if (!password) return setError("Password required.");

    setLoading(true);
    try {
      // Attempt to decrypt the stored wallet key with the password
      let decrypted: string | null = null;
      try {
        decrypted = await unlockWalletKey(selectedKeyId, password);
      } catch (err: any) {
        // If decrypt throws, show a clearer message
        const msg = String(err?.message ?? err ?? "Decryption error");
        // Try to detect wrong-password-like messages
        if (/incorrect|invalid|wrong|decrypt|password/i.test(msg)) {
          setError("Incorrect password.");
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }

      // If decrypt returned falsy or non-useful value, treat as incorrect password
      if (!decrypted || typeof decrypted !== "string" || !decrypted.trim()) {
        setError("Incorrect password or corrupted key.");
        setLoading(false);
        return;
      }

      const trimmed = decrypted.trim();

      // compute session duration in seconds and call unlockSession
      const durationSeconds = computeDurationSeconds(duration);

      try {
        // If unlockSession expects seconds, pass seconds. If it expects minutes in your
        // runtime you can adjust, but typically seconds is safer.
        await unlockSession(selectedKeyId, trimmed, durationSeconds);
      } catch (e) {
        // don't block unlock flow on session store failure — show a gentle warning
        console.warn("unlockSession failed:", e);
      }

      try {
        setUFVKInStore(trimmed, { force: true });
      } catch (e) {
        console.warn("walletStore.setUFVK failed:", e);
      }

      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("zecrete:hasKey", "1");
          localStorage.setItem("zecrete:lastKeyId", selectedKeyId);
        }
      } catch (e) {
        console.warn("Failed to write zecrete:hasKey flag", e);
      }

      try {
        const mask = (s: string) => `${s.slice(0, 6)}...${s.slice(-6)}`;
        console.debug(
          "[UnlockModal] emitting wallet:loaded for key:",
          selectedKeyId,
          "ufvk(masked):",
          mask(trimmed)
        );
        eventBus.emit("wallet:loaded", { keyId: selectedKeyId, ufvk: trimmed, origin: "unlockModal", force: true });
        eventBus.emit("session:unlocked", { keyId: selectedKeyId, ufvk: trimmed, origin: "unlockModal" });
      } catch (e) {
        console.warn("Failed to emit wallet events:", e);
      }

      onClose?.();
      eventBus.emit("modal:close");
    } catch (err: any) {
      console.error("Unlock failed:", err);
      const msg = String(err?.message ?? err ?? "Unlock failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleForgot() {
    setShowForgotHint(true);
    eventBus.emit("vault:forgot-password", {});
  }

  function handleImportAnother() {
    const confirmed = window.confirm(
      "Importing another UFVK may require scrubbing local state tied to the existing key (this will remove local deterministic wallets & demos). Continue to import another key?"
    );
    if (!confirmed) return;
    eventBus.emit("vault:clear-confirm");
    eventBus.emit("modal:import");
  }

  const durationOptions: { value: number | "persistent"; label: string; desc: string }[] = [
    { value: 10, label: "10m", desc: "Brief" },
    { value: 30, label: "30m", desc: "Standard" },
    { value: 60, label: "1h", desc: "Extended" },
    { value: "persistent", label: "Keep", desc: "Persistent" },
  ];

  if (!open) return null;

  return (
   
    <div className="fixed  inset-0 top-[2rem] z-50 p-8 overflow-auto flex items-start sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 backdrop-blur-xl transition-all duration-300 ${
          isDark ? "bg-black/70" : "bg-white/70"
        }`}
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="relative top-[4rem] z-10 w-full max-w-4xl lg:max-w-3xl max-h-[calc(100vh-6rem)] overflow-hidden">
        {/* Outer decorative glass / border */}
        <div className="relative">
          <div
            className={`absolute -inset-4 rounded-4xl ${
              isDark
                ? "bg-gradient-to-br from-white/5 via-transparent to-black/5 backdrop-blur-2xl border border-white/10"
                : "bg-gradient-to-br from-white/30 via-transparent to-white/10 backdrop-blur-2xl border border-gray-300/30"
            }`}
          />
          <div className="relative rounded-4xl overflow-hidden">
            <div
              className={`absolute inset-0 backdrop-blur-xl ${
                isDark
                  ? "bg-gradient-to-br from-white/[0.03] via-transparent to-black/[0.03] border border-white/10"
                  : "bg-gradient-to-br from-white/90 via-transparent to-white/80 border border-gray-300/30"
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/5 via-transparent to-[var(--accent-dark)]/5" />

            {/* Inner content: split horizontally on large screens */}
            <div className="relative flex flex-col lg:flex-row gap-6 p-6 h-full">
              {/* Left: main form (flex-1) */}
              <div className="flex-1 overflow-auto max-h-[calc(100vh-8rem)] pr-0 lg:pr-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
                        <Lock className="w-5 h-5 text-black" />
                      </div>
                      <div className={`absolute -inset-2 border ${isDark ? "border-[var(--accent)]/20" : "border-[var(--accent)]/30"} rounded-xl`} />
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-[var(--text)]">Unlock Viewing Key</h2>
                      <p className={`text-sm ${isDark ? "text-text-secondary" : "text-gray-600"} mt-0.5`}>
                        Access your stored UFVK securely
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form content */}
                <div className="space-y-5">
                  {/* Key Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-[var(--text)]">
                      <Key className="w-4 h-4" />
                      Select Key
                    </label>
                    {keyList.length === 0 ? (
                      <div
                        className={`p-4 rounded-lg text-center ${
                          isDark ? "bg-black/20 border border-dashed border-white/10" : "bg-gray-100/50 border border-dashed border-gray-300"
                        }`}
                      >
                        <Key className="w-8 h-8 mx-auto mb-2 text-[var(--muted)]" />
                        <p className="text-sm text-[var(--muted)] mb-3">No keys found</p>
                        <button
                          onClick={() => eventBus.emit("modal:import")}
                          className="px-4 py-2 rounded-lg border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors text-sm"
                        >
                          Import First Key
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={selectedKeyId ?? ""}
                          onChange={(e) => setSelectedKeyId(e.target.value || null)}
                          className={`w-full p-3 rounded-lg appearance-none ${
                            isDark
                              ? "bg-black/20 border border-white/10 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20"
                              : "bg-white/50 border border-gray-300 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20"
                          } focus:outline-none transition-all duration-300`}
                        >
                          {keyList.map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.meta?.name ? `${k.meta.name}` : `Key ${k.id.slice(0, 8)}`}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronRight className="w-4 h-4 rotate-90 text-[var(--muted)]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-[var(--text)]">
                      <Lock className="w-4 h-4" />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError(null); // clear error as user edits
                        }}
                        className={`w-full p-3 rounded-lg pr-12 ${
                          isDark
                            ? "bg-black/20 border border-white/10 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20"
                            : "bg-white/50 border border-gray-300 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20"
                        } focus:outline-none transition-all duration-300 ${error ? "ring-2 ring-red-400/30 border-red-400/30" : ""}`}
                        placeholder="Enter your encryption password"
                        onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                        aria-invalid={!!error}
                        aria-describedby={error ? "unlock-error" : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"} transition-colors`}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-[var(--muted)]" /> : <Eye className="w-4 h-4 text-[var(--muted)]" />}
                      </button>
                    </div>
                  </div>

                  {/* Session Duration (mobile / small screens only) */}
                  <div className="space-y-2 lg:hidden">
                    <label className="text-sm font-medium flex items-center gap-2 text-[var(--text)]">
                      <Clock className="w-4 h-4" />
                      Session Duration
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {durationOptions.map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => setDuration(option.value)}
                          className={`p-3 rounded-lg border transition-all duration-300 ${
                            duration === option.value ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : isDark ? "border-white/10 hover:border-[var(--accent)]/30 hover:bg-white/5" : "border-gray-300 hover:border-[var(--accent)]/30 hover:bg-black/5"
                          }`}
                        >
                          <div className="text-sm font-medium">{option.label}</div>
                          <div className="text-xs text-[var(--muted)] mt-0.5">{option.desc}</div>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)] pt-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Use short sessions on shared devices</span>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div
                      id="unlock-error"
                      className={`p-3 rounded-lg flex items-start gap-2 ${
                        isDark ? "bg-red-500/10 border border-red-500/20" : "bg-red-100 border border-red-200"
                      }`}
                      role="alert"
                      aria-live="polite"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-red-500">{error}</span>
                    </div>
                  )}

                  {/* Forgot hint */}
                  {showForgotHint && (
                    <div className={`p-4 rounded-lg ${isDark ? "bg-black/30 border border-[var(--accent)]/30" : "bg-gray-100/50 border border-[var(--accent)]/30"}`}>
                      <div className="flex items-start gap-3">
                        <Shield className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-[var(--accent)] text-sm mb-1">Lost Password?</h4>
                          <p className="text-xs text-[var(--muted)] mb-3">You'll need to clear the current key and re-import your UFVK.</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => eventBus.emit("vault:clear-confirm")}
                              className="px-3 py-1.5 rounded border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors text-xs"
                            >
                              Clear & Re-import
                            </button>
                            <button onClick={() => setShowForgotHint(false)} className="px-3 py-1.5 rounded border border-gray-500/30 hover:bg-black/5 transition-colors text-xs">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={handleUnlock}
                      disabled={loading || !selectedKeyId || !password}
                      className="w-full py-3 rounded-lg btn-gold font-semibold hover-lift transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            <span>Unlocking...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Unlock Key</span>
                          </>
                        )}
                      </span>
                    </button>

                    <div className="flex items-center justify-between pt-2">
                      <button onClick={onClose} className={`px-4 py-2 rounded-lg border transition-colors text-sm ${isDark ? "border-white/10 hover:bg-white/5" : "border-gray-300 hover:bg-black/5"}`}>
                        Cancel
                      </button>

                      <div className="flex items-center gap-4">
                        <button onClick={handleForgot} className="text-sm text-[var(--accent)] hover:underline">
                          Forgot?
                        </button>
                        <button onClick={handleImportAnother} className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          Import another key
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Security features (mobile/left) */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 lg:hidden">
                    <div className={`p-3 rounded-lg flex items-center gap-2 ${isDark ? "bg-black/20" : "bg-gray-100/50"}`}>
                      <Database className="w-4 h-4 text-[var(--accent)]" />
                      <div>
                        <div className="text-xs font-medium">Local</div>
                        <div className="text-xs text-[var(--muted)]">Processing</div>
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg flex items-center gap-2 ${isDark ? "bg-black/20" : "bg-gray-100/50"}`}>
                      <Globe className="w-4 h-4 text-[var(--accent)]" />
                      <div>
                        <div className="text-xs font-medium">Encrypted</div>
                        <div className="text-xs text-[var(--muted)]">End-to-end</div>
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg flex items-center gap-2 ${isDark ? "bg-black/20" : "bg-gray-100/50"}`}>
                      <Terminal className="w-4 h-4 text-[var(--accent)]" />
                      <div>
                        <div className="text-xs font-medium">Open</div>
                        <div className="text-xs text-[var(--muted)]">Source</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: session duration & summary panel for desktop */}
              <aside className="hidden lg:block w-56 flex-shrink-0">
                <div className={`p-4 rounded-lg border ${isDark ? "border-white/6 bg-black/20" : "border-gray-200 bg-white/60"} sticky top-6`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-[var(--accent)]" />
                    <div>
                      <div className="text-xs font-medium">Session</div>
                      <div className="text-xs text-[var(--muted)]">Duration</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {durationOptions.map((opt) => (
                      <button
                        key={String(opt.value)}
                        onClick={() => setDuration(opt.value)}
                        className={`w-full text-left p-2 rounded-md transition-colors ${
                          duration === opt.value
                            ? "bg-[var(--accent)]/10 border border-[var(--accent)] text-[var(--accent)]"
                            : isDark
                            ? "hover:bg-white/5 border border-transparent"
                            : "hover:bg-black/5 border border-transparent"
                        }`}
                      >
                        <div className="text-sm font-medium">{opt.label} <span className="text-xs text-[var(--muted)] ml-2">{opt.desc}</span></div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/6">
                    <div className="text-xs text-[var(--muted)] mb-1">Selected</div>
                    <div className="font-medium">{durationToLabel(duration)}</div>
                    
                  </div>
                </div>

                {/* Desktop security badges */}
                
                  
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
