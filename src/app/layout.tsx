// app/layout.tsx
import "../styles/globals.css";
import React from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "@/context/SessionProvider";
import HotkeysClient from "@/components/HotkeysClient";
import { PriceProvider } from "@/context/PriceProvider";
import { SparklesCore } from "@/components/ui/sparkles";
import DynamicIslandHeader from "@/components/DynamicIslandHeader";
import Image from "next/image";
import { Github, Zap, Shield } from "lucide-react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Zecrete Explorer | Zcash Privacy Analytics",
  description: "Advanced Zcash blockchain explorer with local shielded transaction decryption. Enterprise-grade privacy analytics.",
  keywords: ["Zcash", "privacy", "blockchain", "explorer", "cryptocurrency", "shielded", "transparent", "analytics"],
  authors: [{ name: "Zecrete Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://zecrete.explorer",
    title: "Zecrete Explorer",
    description: "Advanced Zcash privacy analytics explorer",
    siteName: "Zecrete Explorer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zecrete Explorer",
    description: "Advanced Zcash privacy analytics explorer",
    creator: "@earthtrader",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/assets/favicon.ico" />
        <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />

        {/* ===== CRITICAL THEME INLINE SCRIPT (runs before React hydration) =====
            - Resolves stored theme (light|dark|system)
            - Resolves system preference if 'system'
            - Applies class (for Tailwind) and dataset.theme (for CSS var system)
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var key = 'zecrete:theme';
                  var stored = localStorage.getItem(key) || 'system';
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var resolved = stored === 'system' ? (prefersDark ? 'dark' : 'light') : stored;
                  document.documentElement.classList.remove('light','dark');
                  document.documentElement.classList.add(resolved);
                  document.documentElement.dataset.theme = resolved;
                } catch (e) { /* silent */ }
              })();
            `,
          }}
        />
      </head>

      <body className="min-h-screen w-full antialiased bg-[var(--bg)] text-[var(--text)] transition-colors duration-300 overflow-x-hidden">
        {/* Animated background elements */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          {/* Gradient Orbs */}
          <div className="absolute top-0 -right-40 w-80 h-80 bg-[var(--accent)]/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
          <div className="absolute bottom-0 -left-40 w-80 h-80 bg-[var(--accent-dark)]/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
            <SparklesCore
              id="tsparticles"
              background="transparent"
              minSize={0.6}
              maxSize={1.4}
              particleDensity={50}
              className="w-full h-full"
              particleColor="var(--accent)"
            />
          </div>
        </div>

        <SessionProvider>
          <PriceProvider>
            <HotkeysClient>
              {/* Apple Island Style Header */}
              <DynamicIslandHeader />

              <main className="relative z-10 pb-12 px-4 md:px-6 lg:px-8 w-full max-w-none mx-auto">
                <div className="min-h-[calc(100dvh-12rem)] w-full top-[2rem] ">
                  {children}
                </div>
              </main>

              {/* Global Notifications Area */}
              <div id="global-notifications" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md" />

              {/* Footer */}
              <footer className="relative mt-16 border-t border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-xl">
                <div className="max-w-none mx-auto px-4 md:px-6 lg:px-8 py-8 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center overflow-hidden">
                          <Image
                            src="/assets/zecreteLogo.png"
                            alt="Zecrete Logo"
                            width={40}
                            height={40}
                            className="object-contain"
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg gold-gradient-text">Zecrete Explorer</h3>
                          <p className="text-sm text-[var(--muted)]">Zcash Privacy-first Analytics</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">⚡ ZYPHERPUNK</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--text-secondary)]">Gemini Ecosystem</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-serif text-[var(--text-secondary)]">
                        Advanced privacy explorer for the Zcash & Gemini ecosystem.
                        Built with ❤️ for the privacy community.
                      </p>
                      <div className="flex items-center gap-3 pt-2">
                        <a
                          href="https://github.com/zecrete/explorer"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                          title="View on GitHub"
                        >
                          <Github className="w-4 h-4" />
                        </a>
                        <div className="h-4 w-px bg-[var(--border)]" />
                        <span className="text-xs text-[var(--text-secondary)]">Fully Open Source</span>
                      </div>
                    </div>

                    {/* Links */}
                    <div>
                      <h4 className="font-semibold mb-4 text-[var(--text)] flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Explore
                      </h4>
                      <ul className="space-y-2">
                        <li><a href="/explorer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-2 group">
                          <div className="w-1 h-1 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          Block Explorer
                        </a></li>
                        <li><a href="/prod" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-2 group">
                          <div className="w-1 h-1 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          Production Content
                        </a></li>
                        <li><a href="/docs" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-2 group">
                          <div className="w-1 h-1 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          Documentation
                        </a></li>
                        <li><a href="https://github.com/Hiesdiego/zecrete-explorer" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-2 group">
                          <div className="w-1 h-1 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          GitHub Repository
                        </a></li>
                      </ul>
                    </div>

                    {/* Resources */}
                    <div>
                      <h4 className="font-semibold mb-4 text-[var(--text)] flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Resources
                      </h4>
                      <ul className="space-y-2">
                        <li><a href="https://zypherpunk.xyz" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-2 group">
                          <div className="w-1 h-1 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          Zypherpunk Hackathon
                        </a></li>
                        <li><a href="https://gemini.com" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-2 group">
                          <div className="w-1 h-1 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          Gemini
                        </a></li>
                        <li><a href="https://z.cash" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-2 group">
                          <div className="w-1 h-1 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          Zcash Foundation
                        </a></li>
                        <li><a href="https://www.raybot.app" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-2 group">
                          <div className="w-1 h-1 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          RayBot
                        </a></li>
                      </ul>
                    </div>

                    {/* Legal */}
                    <div>
                      <h4 className="font-semibold mb-4 text-[var(--text)]">Legal</h4>
                      <ul className="space-y-2">
                        <li><a href="/privacy" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-2 group">
                          <div className="w-1 h-1 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          Privacy Policy
                        </a></li>
                        <li><a href="/terms" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-2 group">
                          <div className="w-1 h-1 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          Terms of Service
                        </a></li>
                        <li><a href="/security" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-2 group">
                          <div className="w-1 h-1 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          Security
                        </a></li>
                        <li><a href="/disclaimer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-2 group">
                          <div className="w-1 h-1 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          Disclaimer
                        </a></li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-[var(--border)]">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex flex-col md:flex-row items-center gap-4">
                        <p className="text-sm text-[var(--text-secondary)]">
                          © {new Date().getFullYear()} Zecrete Explorer. All rights reserved.
                          <span className="ml-2 text-xs px-2 py-1 rounded bg-[var(--accent)]/10 text-[var(--accent)]">
                            v2.0.0-beta
                          </span>
                        </p>
                        <div className="hidden md:flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <div className="w-1 h-1 rounded-full bg-[var(--accent)]" />
                          <span>Built for the Zypherpunk Hackathon</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-[var(--text-secondary)]">
                          Network: <span className="font-medium text-[var(--accent)]">Running on Mock Data</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-sm text-[var(--text-secondary)]">All Systems Operational</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </footer>
            </HotkeysClient>
          </PriceProvider>
        </SessionProvider>

        {/* Loader for initial page load */}
        <div id="global-loader" className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg)] transition-opacity duration-300 opacity-0 pointer-events-none">
          <div className="relative">
            <div className="w-16 h-16 rounded-full gold-gradient animate-spin" />
            <div className="absolute inset-4 rounded-full bg-[var(--bg)] flex items-center justify-center">
              <Image
                src="/assets/zecreteLogo.png"
                alt="Zecrete Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
          </div>
        </div>

        {/* Script for initial loader */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', () => {
                const loader = document.getElementById('global-loader');
                if (loader) {
                  loader.style.opacity = '1';
                  setTimeout(() => {
                    loader.style.opacity = '0';
                    setTimeout(() => loader.style.display = 'none', 300);
                  }, 500);
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
