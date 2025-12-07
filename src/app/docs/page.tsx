// app/docs/page.tsx
"use client";

import React from "react";
import Image from "next/image";
import { Key, Zap, Sparkles, Github, AlertCircle, CheckCircle2, Info, Terminal } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/hooks/useTheme";

export default function DocsPage() {
  const { isDark } = useTheme();

  // Theme-aware card helpers
  const heavyCard = isDark ? "glass-heavy" : "bg-white/90 backdrop-blur-xl";
  const card = isDark ? "glass" : "bg-white/90 backdrop-blur-xl";
  const surface = "bg-[var(--surface)]";
  const surfaceSubtle = "bg-[var(--surface)]/60";

  return (
    <>
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: 220,
          background:
            "radial-gradient(closest-side at 50% 0%, rgba(250,214,165,0.55), rgba(255,244,214,0.18) 30%, transparent 55%)",
          filter: "blur(36px)",
          zIndex: 0,
        }}
      />

      <div className={`min-h-screen text-[var(--text)] pt-24 pb-16 px-4 sm:px-6 md:px-8 relative z-10 lg:pt-38`}>
        <div className="max-w-5xl mx-auto">

          {/* Hero Header */}
          <header className="text-center mb-8 sm:mb-12">
            <div className={`flex items-center justify-center gap-3 mb-3`}>
              <div className={`${card} p-3 rounded-2xl inline-flex items-center justify-center`}>
                <Image
                  src="/assets/zecreteLogo.png"
                  alt="Zecrete logo"
                  width={180}
                  height={180}
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] bg-clip-text text-transparent mb-3">
              Zecrete Explorer
            </h1>

            <p className="text-base sm:text-lg md:text-xl font-medium text-[var(--text-secondary)] max-w-3xl mx-auto">
              Complete Documentation & Developer Guide
            </p>
            <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)]/90">
              Privacy-first • Client-side • No telemetry by default
            </p>
          </header>

          <div className="space-y-8 sm:space-y-10">

            {/* Quick Summary Card */}
            <section className={`${card} shadow-sm rounded-3xl p-6 sm:p-8 border border-[var(--border)]`}>
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-4 text-[var(--text)]">
                <Zap className="w-7 h-7 text-[var(--accent)]" />
                At a Glance
              </h2>

              <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
                Zecrete is a <strong>privacy-first, fully client-side</strong> shielded transaction explorer for Zcash.
                It decrypts notes, scores privacy, and runs analytics <em>entirely in your browser</em> using a Unified Full Viewing Key (UFVK).
                No data ever leaves your device unless you explicitly export it.
              </p>

              <div className="mt-5 flex items-center gap-2 text-sm font-medium text-[var(--accent)]">
                <CheckCircle2 className="w-5 h-5" />
                Mock mode active in dev • Real scanning in production-ready
              </div>
            </section>

            {/* 1. Mock Data */}
            <section className={`${card} shadow-sm rounded-3xl p-6 sm:p-8 border border-[var(--border)]`}>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-3 text-[var(--text)]">
                <Sparkles className="w-7 h-7 text-[var(--accent)]" />
                1. Mock Data — How It Works
              </h2>

              <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
                <p className="text-sm sm:text-base">
                  During development and demos, Zecrete uses <strong>deterministic mock transactions</strong> generated from your UFVK.
                  This means the same key → always the same portfolio. Perfect for testing, demos, and screenshots.
                </p>

                <div className={`${surfaceSubtle} rounded-2xl p-3 sm:p-4 border border-[var(--border)] font-mono text-xs sm:text-sm overflow-x-auto`}>
                  <code className="text-[var(--accent)]">
                    ufvkdemokey1 → ~120 transactions, recurring payments, memos, etc.
                  </code>
                </div>

                <p className="text-sm opacity-90 text-[var(--text-secondary)]">
                  In production, this generator is disabled and replaced with real on-chain scanning via WASM or light client.
                </p>
              </div>
            </section>

            {/* 2. Key Handling */}
            <section className={`${card} rounded-3xl p-6 sm:p-8 border border-[var(--border)]`}>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-3 text-[var(--text)]">
                <Key className="w-7 h-7 text-[var(--accent)]" />
                2. How Keys Are Stored & Protected
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-[var(--text)]">Import Flow</h3>
                  <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-[var(--accent)] mt-0.5">1</span>
                      <span>You enter UFVK + passphrase</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-[var(--accent)] mt-0.5">2</span>
                      <span>Passphrase → PBKDF2 → encryption key</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-[var(--accent)] mt-0.5">3</span>
                      <span>UFVK encrypted with AES-GCM → stored in localStorage</span>
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2 text-[var(--text)]">Unlock Flow</h3>
                  <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-[var(--accent)] mt-0.5">1</span>
                      <span>Enter passphrase</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-[var(--accent)] mt-0.5">2</span>
                      <span>Decrypt UFVK in memory</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-[var(--accent)] mt-0.5">3</span>
                      <span>Seed wallet store → trigger scan</span>
                    </li>
                  </ol>
                </div>
              </div>

              <div className={`${surfaceSubtle} mt-4 p-3 rounded-2xl border border-[var(--border)]`}>
                <p className="text-sm flex items-center gap-2 text-[var(--text-secondary)]">
                  <AlertCircle className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
                  <strong className="text-[var(--text)]">Never</strong> stored in plaintext. Auto-locks after 10 minutes by default.
                </p>
              </div>
            </section>

            {/* 3. Known Issues */}
            <section className={`${card} rounded-3xl p-6 sm:p-8 border border-[var(--border)]`}>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-3 text-[var(--text)]">
                <Terminal className="w-7 h-7 text-[var(--accent)]" />
                3. Known Issues & Fixes
              </h2>

              <div className="space-y-3">
                {[
                  {
                    title: "Duplicate demo data after unlock",
                    desc: "Caused by multiple wallet:loaded events. Fixed by atomic portfolioLoaded flag and UFVK trimming.",
                  },
                  {
                    title: "All transactions show “today”",
                    desc: "Mock generator used Date.now(). Now uses deterministic timestamps capped at current time.",
                  },
                  {
                    title: "Theme only updates on refresh",
                    desc: "Fixed in latest version — CSS variables now updates instantly via useTheme hook.",
                  },
                  {
                    title: "EventBus listener leaks",
                    desc: "Always use the off() return value from eventBus.on() in useEffect cleanup.",
                  },
                  {
                    title: "Styling Inconsistency",
                    desc: "Tweaked several components to fully utilize CSS variables for theming consistency, or completely replaced hardcoded styles.",
                  },
                ].map((issue, i) => (
                  <div key={i} className={`${card} flex gap-3 p-3 rounded-2xl border border-[var(--border)]`}>
                    <div className={`${surfaceSubtle} p-2 rounded-xl`}>
                      <Info className="w-5 h-5 text-[var(--accent)]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[var(--text)]">{issue.title}</h4>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">{issue.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. UFVK Guide */}
            <section className={`${card} rounded-3xl p-6 sm:p-8 border border-[var(--border)]`}>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-3 text-[var(--text)]">
                <Key className="w-7 h-7 text-[var(--accent)]" />
                4. How to Get Your UFVK
              </h2>

              <div className="space-y-4 text-[var(--text-secondary)]">
                <p className="text-sm sm:text-base">
                  A <strong>Unified Full Viewing Key</strong> lets you view shielded transactions without spending ability.
                  Export it from:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {["YWallet", "Zashi", "Nighthawk", "Unstoppable", "Zingo!", "Edge"].map((wallet) => (
                    <div key={wallet} className={`${surfaceSubtle} p-3 rounded-xl border border-[var(--border)] text-center`}>
                      <div className="text-base font-medium text-[var(--text)]">{wallet}</div>
                      <div className="text-xs mt-1 text-[var(--text-secondary)]">Settings → Export UFVK</div>
                    </div>
                  ))}
                </div>

                <p className="text-sm italic opacity-90 text-[var(--text-secondary)]">
                  Treat your UFVK like a private key. Only use on trusted devices.
                </p>
              </div>
            </section>

            {/* 5. Production Roadmap */}
            <section className={`${card} rounded-3xl p-6 sm:p-8 border border-[var(--border)]`}>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-[var(--text)]">
                5. Production Readiness Checklist
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "WASM decryption (Sapling + Orchard)",
                  "IndexedDB encrypted storage",
                  "WebWorker scanning & scoring",
                  "Argon2 key derivation option",
                  "Export encrypted backups",
                  "Zero telemetry by default",
                  "Full E2E test suite",
                  "Audit-ready crypto",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                    <span className="text-[var(--text-secondary)]">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer */}
            <footer className="text-center py-8 sm:py-10">
              <p className="text-sm text-[var(--text-secondary)]">
                Built for{" "}
                <span className="font-semibold text-[var(--accent)]">Zypherpunk Hackathon</span> •
                Privacy by Design • Open Source
              </p>

              <div className="mt-4">
                <Link
                  href="https://github.com/Hiesdiego/zecrete-explorer"
                  target="_blank"
                  className={`${card} inline-flex items-center gap-2 px-4 sm:px-6 py-2 rounded-full border border-[var(--border)] hover:scale-105 transition`}
                >
                  <Github className="w-4 h-4 text-[var(--text)]" />
                  <span className="text-[var(--text)] font-medium">View Source on GitHub</span>
                </Link>
              </div>

              <p className="mt-6 text-xs text-[var(--text-secondary)]/80">
                © {new Date().getFullYear()} Zecrete Explorer • Docs updated {new Date().toLocaleDateString()}
              </p>
            </footer>

          </div>
        </div>
      </div>
    </>
  );
}
