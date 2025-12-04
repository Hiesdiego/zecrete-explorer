"use client";

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

export default function ProductionGuidePage() {
  return (
    <>
      <div className="min-h-screen  text-[var(--text)] pt-24 pb-20 px-4 sm:px-6 md:px-8">
        <div className="max-w-5xl mx-auto">

          {/* Hero */}
          <header className="text-center mb-12 sm:mb-16 lg:top-[5rem]">
            <div className="inline-flex items-center gap-4 mb-6 sm:mb-8 px-6 sm:px-8 py-3 sm:py-4 rounded-3xl glass-heavy border border-[var(--border)] backdrop-blur-xl">
              <Rocket className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--accent)] inline" />
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mt-2 sm:mt-4 bg-gradient-to-r from-[var(--accent)] via-[var(--accent-light)] to-[var(--accent)] bg-clip-text text-transparent">
                Production Guide
              </h1>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
              How to ship Zecrete Explorer safely, scalably, and audit-ready — while keeping every byte of user data on-device.
            </p>
          </header>

          <div className="space-y-12 sm:space-y-16">

            {/* Core Goals */}
            <section className="glass-heavy rounded-3xl p-6 sm:p-10 border border-[var(--border)]">
              <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-4 mb-6 sm:mb-8">
                <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--accent)]" />
                Core Production Goals
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {[
                  "Zero telemetry by default",
                  "All decryption happens in-browser",
                  "UFVK never leaves the device",
                  "No server-side analytics",
                  "Open-source & reproducible builds",
                  "WASM + WebWorker architecture",
                ].map((goal, i) => (
                  <div key={i} className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-black/20 border border-[var(--border)]">
                    <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--accent)] flex-shrink-0" />
                    <span className="text-base sm:text-lg">{goal}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Mock Data Section */}
            <section className="glass rounded-3xl p-6 sm:p-10 border border-[var(--border)]">
              <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-4 mb-6 sm:mb-8">
                <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--accent)]" />
                Mock & Demo Data Strategy
              </h2>
              <div className="space-y-4 sm:space-y-6 text-[var(--text-secondary)]">
                <p className="text-base sm:text-lg leading-relaxed">
                  Deterministic mock data is critical for reproducible testing, demos, and CI. Never rely on <code>Math.random()</code> in demo mode.
                </p>
                <div className="bg-black/40 rounded-2xl p-4 sm:p-6 border border-[var(--border)] font-mono text-xs sm:text-sm overflow-x-auto">
                  <pre>{`// Deterministic PRNG — same UFVK = same portfolio forever
function seededRandom(seedString) {
  let h = 1779033703 ^ seedString.length;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return () => ((h = Math.imul(h ^ (h >>> 16), 2246822507)) ^ (h >>> 13)) / 2**32 + 0.5;
}`}</pre>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-[var(--accent)]">
                  <AlertTriangle className="w-5 h-5" />
                  Never mix mock data with real wallets — always guard with <code>isDemoMode</code> flag
                </div>
              </div>
            </section>

            {/* UFVK Handling */}
            <section className="glass-heavy rounded-3xl p-6 sm:p-10 border border-[var(--border)]">
              <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-4 mb-6 sm:mb-8">
                <Key className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--accent)]" />
                UFVK Security & Storage
              </h2>
              <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-4">Correct Flow</h3>
                  <ol className="space-y-3 sm:space-y-4 text-sm sm:text-base text-[var(--text-secondary)]">
                    <li className="flex gap-4">
                      <span className="font-bold text-[var(--accent)] text-xl sm:text-2xl">1</span>
                      <div>
                        <strong>User enters UFVK + passphrase</strong>
                        <br />→ Derive key via PBKDF2 (200k+ iterations)
                      </div>
                    </li>
                    <li className="flex gap-4">
                      <span className="font-bold text-[var(--accent)] text-xl sm:text-2xl">2</span>
                      <div>
                        <strong>Encrypt UFVK with AES-GCM</strong>
                        <br />→ Store only ciphertext + salt + iv
                      </div>
                    </li>
                    <li className="flex gap-4">
                      <span className="font-bold text-[var(--accent)] text-xl sm:text-2xl">3</span>
                      <div>
                        <strong>On unlock → decrypt in memory only</strong>
                        <br />Never write plaintext to disk
                      </div>
                    </li>
                  </ol>
                </div>
                <div className="bg-black/30 rounded-2xl p-4 sm:p-6 border border-[var(--border)]">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-[var(--accent)]" />
                    Never Do This
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" /> Store UFVK in plain localStorage</li>
                    <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" /> Send UFVK to any server</li>
                    <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" /> Compare UFVKs without trimming</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Architecture */}
            <section className="glass rounded-3xl p-6 sm:p-10 border border-[var(--border)]">
              <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-4 mb-6 sm:mb-8">
                <Layers className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--accent)]" />
                Recommended Architecture (2025+)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {[
                  { icon: Cpu, title: "WASM Crypto Core", desc: "Rust → WASM for Sapling/Orchard decryption" },
                  { icon: Workflow, title: "WebWorker Pipeline", desc: "Scanning, scoring, AI — all off main thread" },
                  { icon: Database, title: "Encrypted IndexedDB", desc: "Vault, tx cache, notes — all encrypted at rest" },
                ].map((item, i) => (
                  <div key={i} className="text-center p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-[var(--accent)]/5 to-transparent border border-[var(--border)]">
                    <item.icon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-[var(--accent)]" />
                    <h3 className="font-bold text-lg sm:text-xl mb-2">{item.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Common Pitfalls */}
            <section className="glass-heavy rounded-3xl p-6 sm:p-10 border border-[var(--border)]">
              <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-4 mb-6 sm:mb-8">
                <Terminal className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--accent)]" />
                Critical Pitfalls & Fixes
              </h2>
              <div className="space-y-4 sm:space-y-5">
                {[
                  "Duplicate wallet:loaded events → portfolio overwritten",
                  "UFVK string not trimmed → demo mode fails silently",
                  "Math.random() in mock data → flaky tests",
                  "EventBus listeners not cleaned up → memory leaks on HMR",
                  "Theme only updates on refresh → fixed in v2.4+",
                ].map((pitfall, i) => (
                  <div key={i} className="flex gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl bg-black/30 border border-[var(--border)]">
                    <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400 flex-shrink-0" />
                    <div>
                      <code className="text-[var(--accent)] font-mono">{pitfall.split(' → ')[0]}</code>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {pitfall.includes('→') ? pitfall.split(' → ')[1] : pitfall}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Production Snippets */}
            <section className="space-y-6 sm:space-y-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-center">Production Snippets</h2>
              <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                <div className="glass rounded-3xl p-6 sm:p-8 border border-[var(--border)]">
                  <h3 className="text-xl sm:text-2xl font-bold mb-4">Docker (Static Build)</h3>
                  <pre className="text-xs bg-black/50 p-4 sm:p-5 rounded-xl overflow-x-auto border border-[var(--border)]">
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
                <div className="glass rounded-3xl p-6 sm:p-8 border border-[var(--border)]">
                  <h3 className="text-xl sm:text-2xl font-bold mb-4">next.config.js (WASM Ready)</h3>
                  <pre className="text-xs bg-black/50 p-4 sm:p-5 rounded-xl overflow-x-auto border border-[var(--border)]">
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
            <section className="glass-heavy rounded-3xl p-8 sm:p-12 border-2 border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent-glow)]/10">
              <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-10">
                Production Readiness Checklist
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-base sm:text-lg">
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
                  <div key={i} className="flex items-center gap-3 sm:gap-4">
                    <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--accent)]" />
                    {item}
                  </div>
                ))}
              </div>
            </section>

            {/* Footer */}
            <footer className="text-center py-8 sm:py-12">
              <p className="text-[var(--text-secondary)] mb-4 sm:mb-6">
                Built for privacy. Shipped for performance.
              </p>
              <Link
                href="https://github.com/Hiesdiego/zecrete-explorer"
                target="_blank"
                className="inline-flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] text-black font-bold text-base sm:text-lg hover:scale-105 transition shadow-2xl shadow-[var(--accent-glow)]"
              >
                <Github className="w-5 h-5 sm:w-6 sm:h-6" />
                Contribute on GitHub
              </Link>
              <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-[var(--text-secondary)]/70">
                Zecrete Explorer • Production Guide • {new Date().getFullYear()}
              </p>
            </footer>

          </div>
        </div>
      </div>
    </>
  );
}