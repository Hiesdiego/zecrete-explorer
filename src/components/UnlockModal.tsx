//src/components/UnlockModal.tsx

"use client";
import React, { useEffect, useMemo, useState } from "react";
import { eventBus } from "@/lib/eventBus";
import { getVaultIndex, unlockWalletKey, unlockSession } from "@/lib/vault";
import { useWalletStore } from "@/lib/store/walletStore";
import { 
  Lock, Key, Shield, Clock, AlertTriangle, X, 
  Eye, EyeOff, ChevronRight, Check, RotateCw, Database, Globe, Terminal
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

  async function handleUnlock(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!selectedKeyId) return setError("Select a key to unlock.");
    if (!password) return setError("Password required.");

    setLoading(true);
    try {
      const decrypted = await unlockWalletKey(selectedKeyId, password);

      if (!decrypted || typeof decrypted !== "string" || !decrypted.trim()) {
        setError("Incorrect password or corrupted key.");
        setLoading(false);
        return;
      }

      const trimmed = decrypted.trim();
      const minutes = duration === "persistent" ? 60 * 24 * 365 * 10 : Number(duration);
      
      try {
        await unlockSession(selectedKeyId, trimmed, minutes);
      } catch (e) {
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
        console.debug("[UnlockModal] emitting wallet:loaded for key:", selectedKeyId, "ufvk(masked):", mask(trimmed));
        eventBus.emit("wallet:loaded", { keyId: selectedKeyId, ufvk: trimmed, origin: "unlockModal", force: true });
        eventBus.emit("session:unlocked", { keyId: selectedKeyId, ufvk: trimmed, origin: "unlockModal" });
      } catch (e) {
        console.warn("Failed to emit wallet events:", e);
      }

      onClose?.();
      eventBus.emit("modal:close");
    } catch (err: any) {
      console.error("Unlock failed:", err);
      setError(err?.message ?? "Unlock failed");
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
    { value: "persistent", label: "Keep", desc: "Persistent" }
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 inset-0 z-[9999] top-[6rem] lg:top-[22rem] flex items-center justify-center p-4">
      {/* Backdrop with theme-aware colors */}
      <div 
        className={`absolute inset-0 backdrop-blur-xl transition-all duration-300 ${
          isDark ? 'bg-black/70' : 'bg-white/70'
        }`}
        onClick={onClose}
      />
      
      {/* Modal Container - Properly sized */}
      <div className="relative z-10 w-full max-w-lg animate-in fade-in zoom-in-95 duration-300">
        <div className="relative">
          {/* Outer Glass Effect */}
          <div className={`absolute -inset-4 rounded-2xl ${
            isDark 
              ? 'bg-gradient-to-br from-white/5 via-transparent to-black/5 backdrop-blur-2xl border border-white/10' 
              : 'bg-gradient-to-br from-white/30 via-transparent to-white/10 backdrop-blur-2xl border border-gray-300/30'
          }`} />
          
          {/* Main Content Area */}
          <div className="relative rounded-xl overflow-hidden">
            {/* Glass Background */}
            <div className={`absolute inset-0 backdrop-blur-xl ${
              isDark 
                ? 'bg-gradient-to-br from-white/[0.03] via-transparent to-black/[0.03] border border-white/10' 
                : 'bg-gradient-to-br from-white/90 via-transparent to-white/80 border border-gray-300/30'
            }`} />
            
            {/* Accent Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/5 via-transparent to-[var(--accent-dark)]/5" />

            <div className="relative p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
                      <Lock className="w-5 h-5 text-black" />
                    </div>
                    {/* Subtle Ring */}
                    <div className={`absolute -inset-2 border ${
                      isDark ? 'border-[var(--accent)]/20' : 'border-[var(--accent)]/30'
                    } rounded-xl`} />
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-bold text-[var(--text)]">Unlock Viewing Key</h2>
                    <p className={`text-sm ${isDark ? 'text-text-secondary' : 'text-gray-600'} mt-0.5`}>
                      Access your stored UFVK securely
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main Content */}
              <div className="space-y-5">
                {/* Key Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-[var(--text)]">
                    <Key className="w-4 h-4" />
                    Select Key
                  </label>
                  {keyList.length === 0 ? (
                    <div className={`p-4 rounded-lg text-center ${
                      isDark ? 'bg-black/20 border border-dashed border-white/10' : 'bg-gray-100/50 border border-dashed border-gray-300'
                    }`}>
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
                            ? 'bg-black/20 border border-white/10 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20' 
                            : 'bg-white/50 border border-gray-300 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20'
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
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full p-3 rounded-lg pr-12 ${
                        isDark 
                          ? 'bg-black/20 border border-white/10 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20' 
                          : 'bg-white/50 border border-gray-300 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20'
                      } focus:outline-none transition-all duration-300`}
                      placeholder="Enter your encryption password"
                      onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded ${
                        isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
                      } transition-colors`}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-[var(--muted)]" />
                      ) : (
                        <Eye className="w-4 h-4 text-[var(--muted)]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
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
                          duration === option.value
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                            : isDark 
                              ? 'border-white/10 hover:border-[var(--accent)]/30 hover:bg-white/5'
                              : 'border-gray-300 hover:border-[var(--accent)]/30 hover:bg-black/5'
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
                  <div className={`p-3 rounded-lg flex items-start gap-2 ${
                    isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-100 border border-red-200'
                  }`}>
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-red-500">{error}</span>
                  </div>
                )}

                {/* Forgot Hint */}
                {showForgotHint && (
                  <div className={`p-4 rounded-lg ${
                    isDark ? 'bg-black/30 border border-[var(--accent)]/30' : 'bg-gray-100/50 border border-[var(--accent)]/30'
                  }`}>
                    <div className="flex items-start gap-3">
                      <Shield className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-[var(--accent)] text-sm mb-1">Lost Password?</h4>
                        <p className="text-xs text-[var(--muted)] mb-3">
                          You'll need to clear the current key and re-import your UFVK.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => eventBus.emit("vault:clear-confirm")}
                            className="px-3 py-1.5 rounded border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors text-xs"
                          >
                            Clear & Re-import
                          </button>
                          <button
                            onClick={() => setShowForgotHint(false)}
                            className="px-3 py-1.5 rounded border border-gray-500/30 hover:bg-black/5 transition-colors text-xs"
                          >
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
                    <button
                      onClick={onClose}
                      className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                        isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-300 hover:bg-black/5'
                      }`}
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={handleImportAnother}
                      className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1"
                    >
                      <Key className="w-3 h-3" />
                      Import another key
                    </button>
                  </div>
                </div>

                {/* Security Features */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${
                    isDark ? 'bg-black/20' : 'bg-gray-100/50'
                  }`}>
                    <Database className="w-4 h-4 text-[var(--accent)]" />
                    <div>
                      <div className="text-xs font-medium">Local</div>
                      <div className="text-xs text-[var(--muted)]">Processing</div>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${
                    isDark ? 'bg-black/20' : 'bg-gray-100/50'
                  }`}>
                    <Globe className="w-4 h-4 text-[var(--accent)]" />
                    <div>
                      <div className="text-xs font-medium">Encrypted</div>
                      <div className="text-xs text-[var(--muted)]">End-to-end</div>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${
                    isDark ? 'bg-black/20' : 'bg-gray-100/50'
                  }`}>
                    <Terminal className="w-4 h-4 text-[var(--accent)]" />
                    <div>
                      <div className="text-xs font-medium">Open</div>
                      <div className="text-xs text-[var(--muted)]">Source</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}