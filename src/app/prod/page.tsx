// src/app/production/page.tsx
"use client";

import React from "react";
import { 
  Shield, 
  Key, 
  Zap, 
  Cpu, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Terminal, 
  Github,
  Rocket,
  Database,
  Layers,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/hooks/useTheme";

export default function ProductionGuidePage() {
  const { isDark } = useTheme();

  // theme-aware helpers
  const heavyCard = isDark ? "glass-heavy" : "bg-white/90 backdrop-blur-xl";
  const card = isDark ? "glass" : "bg-white/90 backdrop-blur-xl";
  const surface = "bg-[var(--surface)]";
  const surfaceSubtle = "bg-[var(--surface)]/60";

  return (
    <>
      <div className="min-h-screen text-[var(--text)] lg:pt-[9rem] pt-20 pb-20 px-4 sm:px-6 md:px-8 ">
        <div className="max-w-5xl mx-auto">

          {/* Hero */}
          <header className="text-center mb-8 sm:mb-12 ">
            <div className={`${heavyCard} inline-flex flex-col sm:flex-row items-center gap-4 mb-4 sm:mb-6 px-6 sm:px-8 py-3 sm:py-4 rounded-3xl border border-[var(--border)]`}>
              <Rocket className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--accent)]" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mt-1 sm:mt-0 bg-gradient-to-r from-[var(--accent)] via-[var(--accent-light)] to-[var(--accent)] bg-clip-text text-transparent">
                Production Guide
              </h1>
            </div>

            <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed px-2">
              How to ship Zecrete Explorer safely, scalably, and audit-ready — while keeping every byte of user data on-device.
            </p>
          </header>

          <div className="space-y-8 sm:space-y-12">

            {/* Core Goals */}
            <section className={`${heavyCard} rounded-3xl p-5 sm:p-8 border border-[var(--border)]`}>
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-4">
                <Shield className="w-7 h-7 text-[var(--accent)]" />
                Core Production Goals
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {[
                  "Zero telemetry by default",
                  "All decryption happens in-browser",
                  "UFVK never leaves the device",
                  "No server-side analytics",
                  "Open-source & reproducible builds",
                  "WASM + WebWorker architecture",
                ].map((goal, i) => (
                  <div key={i} className={`${card} flex items-center gap-3 p-3 sm:p-4 rounded-2xl border border-[var(--border)]`}>
                    <CheckCircle2 className="w-6 h-6 text-[var(--accent)] flex-shrink-0" />
                    <span className="text-sm sm:text-base text-[var(--text)]">{goal}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Mock Data Section */}
            <section className={`${card} rounded-3xl p-5 sm:p-8 border border-[var(--border)]`}>
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-4">
                <Zap className="w-7 h-7 text-[var(--accent)]" />
                Mock & Demo Data Strategy
              </h2>

              <div className="space-y-3 text-[var(--text-secondary)]">
                <p className="text-sm sm:text-base leading-relaxed">
                  Deterministic mock data is critical for reproducible testing, demos, and CI. Never rely on <code>Math.random()</code> in demo mode.
                </p>

                <div className={`${surfaceSubtle} rounded-2xl p-3 sm:p-4 border border-[var(--border)] font-mono text-[10px] sm:text-xs overflow-x-auto`}>
                  <pre className="whitespace-pre-wrap">
{`// Deterministic PRNG — same UFVK = same portfolio forever
function seededRandom(seedString) {
  let h = 1779033703 ^ seedString.length;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return () => ((h = Math.imul(h ^ (h >>> 16), 2246822507)) ^ (h >>> 13)) / 2**32 + 0.5;
}`}
                  </pre>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent)]">
                  <AlertTriangle className="w-4 h-4" />
                  Never mix mock data with real wallets — always guard with <code>isDemoMode</code> flag
                </div>
              </div>
            </section>

            {/* UFVK Handling */}
            <section className={`${heavyCard} rounded-3xl p-5 sm:p-8 border border-[var(--border)]`}>
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-4">
                <Key className="w-7 h-7 text-[var(--accent)]" />
                UFVK Security & Storage
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-3">Correct Flow</h3>
                  <ol className="space-y-2 text-sm sm:text-base text-[var(--text-secondary)]">
                    <li className="flex gap-3">
                      <span className="font-bold text-[var(--accent)] text-lg sm:text-xl">1</span>
                      <div>
                        <strong>User enters UFVK + passphrase</strong>
                        <br />→ Derive key via PBKDF2 (200k+ iterations)
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-[var(--accent)] text-lg sm:text-xl">2</span>
                      <div>
                        <strong>Encrypt UFVK with AES-GCM</strong>
                        <br />→ Store only ciphertext + salt + iv
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-[var(--accent)] text-lg sm:text-xl">3</span>
                      <div>
                        <strong>On unlock → decrypt in memory only</strong>
                        <br />Never write plaintext to disk
                      </div>
                    </li>
                  </ol>
                </div>

                <div className={`${surfaceSubtle} rounded-2xl p-3 sm:p-4 border border-[var(--border)]`}>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[var(--accent)]" />
                    Never Do This
                  </h4>
                  <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                    <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" /> Store UFVK in plain localStorage</li>
                    <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" /> Send UFVK to any server</li>
                    <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" /> Compare UFVKs without trimming</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Architecture */}
            <section className={`${card} rounded-3xl p-5 sm:p-8 border border-[var(--border)]`}>
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-4">
                <Layers className="w-7 h-7 text-[var(--accent)]" />
                Recommended Architecture (2025+)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { icon: Cpu, title: "WASM Crypto Core", desc: "Rust → WASM for Sapling/Orchard decryption" },
                  { icon: Workflow, title: "WebWorker Pipeline", desc: "Scanning, scoring, AI — all off main thread" },
                  { icon: Database, title: "Encrypted IndexedDB", desc: "Vault, tx cache, notes — all encrypted at rest" },
                ].map((item, i) => (
                  <div key={i} className="text-center p-4 rounded-2xl border border-[var(--border)]">
                    <item.icon className="w-10 h-10 mx-auto mb-3 text-[var(--accent)]" />
                    <h3 className="font-semibold text-lg mb-1 text-[var(--text)]">{item.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Common Pitfalls */}
            <section className={`${heavyCard} rounded-3xl p-5 sm:p-8 border border-[var(--border)]`}>
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-4">
                <Terminal className="w-7 h-7 text-[var(--accent)]" />
                Critical Pitfalls & Fixes
              </h2>

              <div className="space-y-3 sm:space-y-4">
                {[
                  "Duplicate wallet:loaded events → portfolio overwritten",
                  "UFVK string not trimmed → demo mode fails silently",
                  "Math.random() in mock data → flaky tests",
                  "EventBus listeners not cleaned up → memory leaks on HMR",
                  "Theme only updates on refresh → fixed in v2.4+",
                ].map((pitfall, i) => (
                  <div key={i} className={`${card} flex gap-3 p-3 rounded-2xl border border-[var(--border)]`}>
                    <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0" />
                    <div>
                      <code className="text-[var(--accent)] font-mono">{pitfall.split(" → ")[0]}</code>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {pitfall.includes("→") ? pitfall.split(" → ")[1] : pitfall}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Production Snippets */}
            <section className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-center">Production Snippets</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className={`${card} rounded-3xl p-4 sm:p-6 border border-[var(--border)]`}>
                  <h3 className="text-lg sm:text-xl font-semibold mb-3">Docker (Static Build)</h3>
                  <pre className={`${surfaceSubtle} p-3 sm:p-4 rounded-xl overflow-x-auto text-xs sm:text-sm font-mono border border-[var(--border)]`}>
{`FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/.next /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`}
                  </pre>
                </div>

                <div className={`${card} rounded-3xl p-4 sm:p-6 border border-[var(--border)]`}>
                  <h3 className="text-lg sm:text-xl font-semibold mb-3">next.config.js (WASM Ready)</h3>
                  <pre className={`${surfaceSubtle} p-3 sm:p-4 rounded-xl overflow-x-auto text-xs sm:text-sm font-mono border border-[var(--border)]`}>
{`module.exports = {
  webpack(config) {
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });
    return config;
  },
  experimental: { scrollRestoration: true },
};`}
                  </pre>
                </div>
              </div>
            </section>

            {/* Final Checklist */}
            <section className={`${heavyCard} rounded-3xl p-6 sm:p-8 border-2 border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent-glow)]/8`}>
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">Production Readiness Checklist</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm sm:text-base">
                {[
                  "WASM crypto audited & pinned",
                  "IndexedDB encrypted storage",
                  "WebWorker scanning pipeline",
                  "Zero-knowledge telemetry",
                  "E2E tests with real compact blocks",
                  "Auto-lock + session expiry",
                  "Export encrypted backups",
                  "Ghost Mode respected everywhere",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--accent)]" />
                    <span className="text-[var(--text)]">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer */}
            <footer className="text-center py-6 sm:py-8">
              <p className="text-[var(--text-secondary)] mb-3 sm:mb-4">
                Built for privacy. Shipped for performance.
              </p>

              <Link
                href="https://github.com/Hiesdiego/zecrete-explorer"
                target="_blank"
                className="inline-flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] text-black font-bold text-sm sm:text-base hover:scale-105 transition shadow  hover:text-white"
              >
                <Github className="w-4 h-4 sm:w-5 sm:h-5" />
                Contribute on GitHub
              </Link>

              <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-[var(--text-secondary)]/80">
                Zecrete Explorer • Production Guide • {new Date().getFullYear()}
              </p>
            </footer>

          </div>
        </div>
      </div>
    </>
  );
}
