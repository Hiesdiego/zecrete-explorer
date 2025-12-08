// app/docs/page.tsx 
"use client";

import Image from "next/image";
import { Key, Zap, Sparkles, Github, AlertCircle, CheckCircle2, Info, Terminal } from "lucide-react";
import Link from "next/link";

export default function DocsPage() {
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

      <div className="min-h-screen  text-gray-800 pt-24 pb-16 px-6 md:px-8 relative z-10">
        <div className="max-w-5xl mx-auto">

          {/* Hero Header */}
          <header className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-4 rounded-2xl bg-white/60">
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
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-300 bg-clip-text text-transparent mb-4">
              Zecrete Explorer
            </h1>
            <p className="text-xl md:text-2xl font-medium text-gray-600">
              Complete Documentation & Developer Guide
            </p>
            <p className="mt-3 text-sm text-gray-600/80">
              Privacy-first • Client-side • No telemetry by default
            </p>
          </header>

          <div className="space-y-12">

            {/* Quick Summary Card */}
            <section className="bg-white shadow-sm rounded-3xl p-8 border border-gray-200">
              <h2 className="text-3xl font-bold flex items-center gap-3 mb-4">
                <Zap className="w-8 h-8 text-yellow-600" />
                At a Glance
              </h2>
              <p className="text-lg leading-relaxed text-gray-600">
                Zecrete is a <strong>privacy-first, fully client-side</strong> shielded transaction explorer for Zcash.
                It decrypts notes, scores privacy, and runs analytics <em>entirely in your browser</em> using a Unified Full Viewing Key (UFVK).
                No data ever leaves your device unless you explicitly export it.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-yellow-600">
                <CheckCircle2 className="w-5 h-5" />
                Mock mode active in dev • Real scanning in production-ready
              </div>
            </section>

            {/* 1. Mock Data */}
            <section className="bg-white shadow-sm rounded-3xl p-8 border border-gray-200">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-yellow-600" />
                1. Mock Data — How It Works
              </h2>
              <div className="space-y-5 text-gray-600 leading-relaxed">
                <p>
                  During development and demos, Zecrete uses <strong>deterministic mock transactions</strong> generated from your UFVK.
                  This means the same key → always the same portfolio. Perfect for testing, demos, and screenshots.
                </p>
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <code className="text-sm font-mono text-yellow-600">
                    ufvkdemokey1 → ~120 transactions, recurring payments, memos, etc.
                  </code>
                </div>
                <p className="text-sm opacity-80 text-gray-600">
                  In production, this generator is disabled and replaced with real on-chain scanning via WASM or light client.
                </p>
              </div>
            </section>

            {/* 2. Key Handling */}
            <section className="bg-white shadow-sm rounded-3xl p-8 border border-gray-200">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Key className="w-8 h-8 text-yellow-600" />
                2. How Keys Are Stored & Protected
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Import Flow</h3>
                  <ol className="space-y-3 text-sm text-gray-600">
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-yellow-600 mt-0.5">1</span>
                      <span>You enter UFVK + passphrase</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-yellow-600 mt-0.5">2</span>
                      <span>Passphrase → PBKDF2 → encryption key</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-yellow-600 mt-0.5">3</span>
                      <span>UFVK encrypted with AES-GCM → stored in localStorage</span>
                    </li>
                  </ol>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Unlock Flow</h3>
                  <ol className="space-y-3 text-sm text-gray-600">
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-yellow-600 mt-0.5">1</span>
                      <span>Enter passphrase</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-yellow-600 mt-0.5">2</span>
                      <span>Decrypt UFVK in memory</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-bold text-yellow-600 mt-0.5">3</span>
                      <span>Seed wallet store → trigger scan</span>
                    </li>
                  </ol>
                </div>
              </div>
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-2xl">
                <p className="text-sm flex items-center gap-2 text-gray-700">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <strong>Never</strong> stored in plaintext. Auto-locks after 10 minutes by default.
                </p>
              </div>
            </section>

            {/* 3. Known Issues */}
            <section className="bg-white shadow-sm rounded-3xl p-8 border border-gray-200">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Terminal className="w-8 h-8 text-yellow-600" />
                3. Known Issues & Fixes
              </h2>
              <div className="space-y-6">
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
                  <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="p-2 bg-yellow-50 rounded-xl">
                      <Info className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{issue.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{issue.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. UFVK Guide */}
            <section className="bg-white shadow-sm rounded-3xl p-8 border border-gray-200">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Key className="w-8 h-8 text-yellow-600" />
                4. How to Get Your UFVK
              </h2>
              <div className="space-y-5 text-gray-600">
                <p>
                  A <strong>Unified Full Viewing Key</strong> lets you view shielded transactions without spending ability.
                  Export it from:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {["YWallet", "Zashi", "Nighthawk", "Unstoppable", "Zingo!", "Edge"].map((wallet) => (
                    <div key={wallet} className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                      <div className="text-lg font-medium text-gray-800">{wallet}</div>
                      <div className="text-xs mt-1 text-gray-600">Settings → Export UFVK</div>
                    </div>
                  ))}
                </div>
                <p className="text-sm italic opacity-80 text-gray-600">
                  Treat your UFVK like a private key. Only use on trusted devices.
                </p>
              </div>
            </section>

            {/* 5. Production Roadmap */}
            <section className="bg-white shadow-sm rounded-3xl p-8 border border-gray-200">
              <h2 className="text-3xl font-bold mb-6">
                5. Production Readiness Checklist ( Necessary For Production Ready Zecrete Explorer )
              </h2>
              <div className="grid md:grid-cols-2 gap-5">
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
                    <CheckCircle2 className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <span className="text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer */}
            <footer className="text-center py-12 opacity-90">
              <p className="text-sm text-gray-600">
                Built for{" "}
                <span className="font-bold text-yellow-600">Zypherpunk Hackathon</span> •
                Privacy by Design • Open Source
              </p>
              <div className="mt-6">
                <Link
                  href="https://github.com/Hiesdiego/zecrete-explorer"
                  target="_blank"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-50 border border-yellow-100 hover:bg-yellow-100 transition"
                >
                  <Github className="w-5 h-5 text-gray-800" />
                  View Source on GitHub
                </Link>
              </div>
              <p className="mt-8 text-xs text-gray-500">
                © 2025 Zecrete Explorer • Docs updated {new Date().toLocaleDateString()}
              </p>
            </footer>

          </div>
        </div>
      </div>
    </>
  );
}
