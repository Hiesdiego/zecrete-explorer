// src/components/UFVKImport.tsx

"use client";
import React, { useState } from "react";
import { importWalletKey, unlockWalletKey, unlockSession } from "@/lib/vault";
import { eventBus } from "@/lib/eventBus";
import { useWalletStore } from "@/lib/store/walletStore";
import {
  Lock,
  Key,
  Shield,
  CheckCircle,
  AlertCircle,
  Upload,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const DEMO_UFVK = "ufvkdemokey1";

export default function UFVKImport() {
  const { isDark } = useTheme();
  const [ufvk, setUfvk] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"form" | "success">("form");
  const [error, setError] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const setUFVKInStore = useWalletStore((s) => s.setUFVK);

  async function submit() {
    setError("");
    if (!ufvk.trim()) return setError("UFVK is required.");
    if (!password.trim()) return setError("Password is required.");

    setLoading(true);
    try {
      const walletKey = await importWalletKey(ufvk.trim(), password.trim());
      const keyId = (walletKey as any)?.id ?? null;
      if (!keyId) throw new Error("Vault did not return a key id");

      const decrypted = await unlockWalletKey(keyId, password.trim());
      if (!decrypted) throw new Error("Incorrect password or corrupted UFVK.");

      try {
        await unlockSession(keyId, decrypted, 10);
      } catch (e) {
        console.warn("unlockSession failed:", e);
      }

      setUFVKInStore(decrypted.trim());

      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("zecrete:hasKey", "1");
          localStorage.setItem("zecrete:lastKeyId", keyId);
        }
      } catch (e) {
        console.warn("Failed writing zecrete:hasKey flag", e);
      }

      eventBus.emit("wallet:loaded", { keyId, ufvk: decrypted.trim() });
      try {
        eventBus.emit("vault:key-added", {
          keyId,
          meta: { name: walletKey.name, color: walletKey.color, createdAt: walletKey.createdAt },
        });
      } catch {}

      setStage("success");
    } catch (err: any) {
      console.error("UFVK import error:", err);
      setError(err?.message ?? "Failed to import UFVK.");
    } finally {
      setLoading(false);
    }
  }

  const insertDemoKey = () => {
    setUfvk(DEMO_UFVK);
    setPassword("demo_password_123");
    setShowDemo(false);
  };

  if (stage === "success") {
    return (
      <div
        className={`relative  p-6 rounded-xl overflow-hidden ${
          isDark ? "glass border border-white/10" : "bg-white/95 border border-gray-200/50"
        }`}
      >
        <div className="text-center space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gold-gradient mb-3">
            <CheckCircle className="w-8 h-8 text-black" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-[var(--text)] mb-2">Import Complete</h2>
            <p className={`text-sm ${isDark ? "text-text-secondary" : "text-gray-600"}`}>
              Your UFVK has been securely stored and unlocked.
            </p>
          </div>

          <button
            onClick={() => {
              eventBus.emit("modal:close");
            }}
            className="px-8 py-3 rounded-lg btn-gold font-semibold hover-lift transition-all duration-300"
          >
            Continue to Explorer
          </button>
        </div>
      </div>
    );
  }

  const passwordStrength = password.length < 6 ? "Weak" : password.length < 10 ? "Medium" : "Strong";
  const strengthColor =
    password.length < 6 ? "text-red-500" : password.length < 10 ? "text-[var(--accent)]" : "text-green-500";

  return (
    <div className="relative w-full max-w-lg md:max-w-xl lg:max-w-2xl mx-auto top-[3rem] lg:top-[5rem] px-4">
      <div
        className={`relative rounded-xl overflow-hidden ${
          isDark ? "glass border border-white/10" : "bg-white/95 border border-gray-200/50"
        }`}
      >
        <div className="p-5 md:p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gold-gradient">
              <Key className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text)]">Import UFVK</h2>
              <p className={`text-sm ${isDark ? "text-text-secondary" : "text-gray-600"} mt-0.5`}>
                Securely import your Unified Full Viewing Key
              </p>
            </div>
          </div>

          {/* Demo Key Hint */}
          {!showDemo && ufvk !== DEMO_UFVK && (
            <div
              className={`p-3 rounded-lg flex items-center justify-between ${
                isDark ? "bg-black/30 border border-[var(--accent)]/20" : "bg-gray-100/50 border border-[var(--accent)]/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-sm">First time? Try the demo key</span>
              </div>
              <button
                onClick={() => setShowDemo(true)}
                className="px-2.5 py-1 rounded border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors text-xs"
              >
                Show Demo
              </button>
            </div>
          )}

          {showDemo && (
            <div
              className={`p-4 rounded-lg ${
                isDark ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30" : "bg-[var(--accent)]/5 border border-[var(--accent)]/30"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--accent)]" />
                  <h4 className="font-semibold text-[var(--accent)] text-sm">Demo Mode</h4>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  This is a safe demo key for testing. Your real UFVK will be encrypted locally.
                </p>
                <button onClick={insertDemoKey} className="px-3 py-1.5 rounded gold-gradient text-black text-xs font-semibold hover-lift">
                  Use Demo Key
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* UFVK Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5 text-[var(--text)]">
                <Key className="w-3.5 h-3.5" />
                Unified Full Viewing Key
              </label>
              <div className="relative">
                <textarea
                  className={`w-full p-3 rounded-lg text-sm resize-none min-h-[64px] ${
                    isDark
                      ? "bg-black/30 border border-white/10 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20"
                      : "bg-white/50 border border-gray-300 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20"
                  } focus:outline-none transition-all duration-300`}
                  placeholder="ufvkdemokey1"
                  value={ufvk}
                  onChange={(e) => setUfvk(e.target.value)}
                  spellCheck="false"
                />
                {ufvk && (
                  <div
                    className={`absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded ${
                      isDark ? "bg-black/50" : "bg-gray-100"
                    } text-[var(--muted)]`}
                  >
                    {ufvk.length}
                  </div>
                )}
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5 text-[var(--text)]">
                <Lock className="w-3.5 h-3.5" />
                Encryption Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`w-full p-3 rounded-lg pr-10 ${
                    isDark
                      ? "bg-black/30 border border-white/10 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20"
                      : "bg-white/50 border border-gray-300 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20"
                  } focus:outline-none transition-all duration-300`}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"} transition-colors`}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5 text-[var(--muted)]" /> : <Eye className="w-3.5 h-3.5 text-[var(--muted)]" />}
                </button>
              </div>

              {/* Password Strength */}
              {password.length > 0 && (
                <div className={`p-3 rounded-lg ${isDark ? "bg-black/30 border border-white/10" : "bg-gray-100/50 border border-gray-300"}`}>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[var(--muted)]">Password Strength</span>
                    <span className={`font-medium ${strengthColor}`}>{passwordStrength}</span>
                  </div>
                  <div className={`${isDark ? "bg-white/10" : "bg-gray-300"} h-1.5 rounded-full overflow-hidden`}>
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        password.length < 6 ? "bg-red-500" : password.length < 10 ? "bg-[var(--accent)]" : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(password.length * 10, 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div
                      className={`text-xs p-1 rounded text-center ${
                        password.length >= 6 ? (isDark ? "bg-green-500/10 text-green-400" : "bg-green-100 text-green-600") : isDark ? "bg-white/5 text-text-secondary" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      6+ chars
                    </div>
                    <div
                      className={`text-xs p-1 rounded text-center ${
                        password.length >= 10 ? (isDark ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--accent)]/10 text-[var(--accent)]") : isDark ? "bg-white/5 text-text-secondary" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      10+ chars
                    </div>
                    <div
                      className={`text-xs p-1 rounded text-center ${
                        password.length >= 14 ? (isDark ? "bg-green-500/10 text-green-400" : "bg-green-100 text-green-600") : isDark ? "bg-white/5 text-text-secondary" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      14+ chars
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className={`p-3 rounded-lg flex items-start gap-2 ${isDark ? "bg-red-500/10 border border-red-500/20" : "bg-red-100 border border-red-200"}`}>
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-500">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={submit}
              disabled={loading || !ufvk.trim() || !password.trim()}
              className="w-full py-3 rounded-lg btn-gold font-semibold hover-lift transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Import UFVK</span>
                  </>
                )}
              </span>
            </button>

            {/* Security Note */}
            <div className={`pt-3 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
              <div className="flex items-start gap-2 text-xs text-[var(--muted)]">
                <Shield className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <p>Your UFVK is encrypted locally. Never share your password or UFVK.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
