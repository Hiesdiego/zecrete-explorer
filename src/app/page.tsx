// src/app/page.tsx

"use client";

import Link from "next/link";
import {
  Shield,
  Zap,
  Lock,
  Search,
  BarChart3,
  Sparkles,
  Coins,
  ShieldCheck,
  Cpu,
  Globe,
  Activity,
  Users,
  Server,
  Wallet,
  Github,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import Image from "next/image";

export default function HomePage() {
  const { isDark } = useTheme();

  const features = [
    {
      icon: Shield,
      title: "Local Decryption",
      description: "Shielded transaction data never leaves your browser",
      color: "from-[var(--accent)] to-[var(--accent-dark)]",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Real-time privacy metrics & network insights",
      color: "from-[#8B5CF6] to-[#EC4899]",
    },
    {
      icon: Lock,
      title: "Zero Trust Architecture",
      description: "Your keys, your data. We never see shielded details",
      color: "from-[#06B6D4] to-[#3B82F6]",
    },
    {
      icon: Zap,
      title: "Real-time Streaming",
      description: "Live blockchain data with WebSocket updates",
      color: "from-[#10B981] to-[#059669]",
    },
    {
      icon: Search,
      title: "Intelligent Search",
      description: "Search across memos, addresses, and transaction metadata",
      color: "from-[#F59E0B] to-[#D97706]",
    },
    {
      icon: Sparkles,
      title: "Visual Insights",
      description: "Interactive graphs and privacy heatmaps",
      color: "from-[#EC4899] to-[#8B5CF6]",
    },
    {
      icon: Activity,
      title: "Network Health",
      description: "Real-time monitoring of Zcash network metrics",
      color: "from-[#EF4444] to-[#F97316]",
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Built by and for the Zcash privacy community",
      color: "from-[#0EA5E9] to-[#8B5CF6]",
    },
  ];

  const stats = [
    { icon: Coins, label: "Total Value Locked", value: "$42.8M", change: "+2.4%" },
    { icon: ShieldCheck, label: "Privacy Score", value: "99.7%", change: "+0.3%" },
    { icon: Cpu, label: "Blocks Processed", value: "1.8M+", change: "24h" },
    { icon: Globe, label: "Network Nodes", value: "1,247", change: "+12" },
    { icon: Server, label: "Uptime", value: "99.99%", change: "30 days" },
    { icon: Wallet, label: "Active Addresses", value: "2.4M", change: "+45K" },
  ];

  return (
    <div className="relative min-h-screen min-w-full overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* smaller/softer blobs on mobile */}
        <div
          className={`absolute right-4 top-16 w-56 h-56 sm:w-[480px] sm:h-[480px] md:w-[800px] md:h-[800px] rounded-full ${
            isDark ? "bg-[var(--accent)]/5" : "bg-[var(--accent)]/3"
          } blur-3xl transform-gpu`}
          aria-hidden
        />
        <div
          className={`absolute left-4 bottom-16 w-56 h-56 sm:w-[480px] sm:h-[480px] md:w-[800px] md:h-[800px] rounded-full ${
            isDark ? "bg-[var(--accent-dark)]/5" : "bg-[var(--accent-dark)]/3"
          } blur-3xl transform-gpu`}
          aria-hidden
        />
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-28 pb-12 sm:pb-20 px-4 sm:px-8 lg:px-12 text-center w-full max-w-screen-2xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <div className="relative w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--accent)]/10 to-transparent blur-xl" />
            <div className="relative z-10">
              <Image
                src="/assets/zecreteLogo.png"
                alt="Zecrete Explorer Logo"
                width={160}
                height={160}
                className="drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-8 tracking-tight leading-tight">
          <span className="gold-gradient-text">Zecrete</span>
          <span className="ml-2 md:ml-4 text-[var(--text)]">Explorer</span>
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-[var(--text-secondary)] max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed">
          Advanced <span className="font-semibold text-[var(--accent)]">Zcash privacy analytics</span> with local shielded transaction decryption
        </p>

        <p className="text-base sm:text-lg text-[var(--muted)] max-w-2xl mx-auto mb-8 sm:mb-12">
          Explore the Zcash blockchain with enterprise-grade privacy tools. Your shielded data stays local, zero trust required.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-10 sm:mb-16 px-4 sm:px-0">
          <Link
            href="/explorer"
            aria-label="Launch Explorer"
            className="btn-gold px-6 sm:px-12 py-3 sm:py-4 rounded-2xl text-lg sm:text-xl font-semibold inline-flex items-center justify-center gap-3 hover-lift w-full sm:w-auto min-w-0"
          >
            <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
            Launch Explorer
            <span className="text-xs sm:text-sm bg-black/20 px-2 py-0.5 rounded-full">v2.0</span>
          </Link>

          <a
            href="https://github.com/Hiesdiego/zecrete-explorer"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
            className="px-6 sm:px-12 py-3 sm:py-4 rounded-2xl text-lg sm:text-xl font-semibold flex items-center justify-center gap-3 hover-lift w-full sm:w-auto min-w-0 border-2 border-[var(--border)] bg-[var(--surface)] transition-all duration-300"
          >
            <Github className="w-5 h-5 sm:w-6 sm:h-6" />
            View on GitHub
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">Open Source</span>
          </a>
        </div>

        {/* Stats Grid */}
        <div className="w-full mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 px-2 sm:px-0">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="card-glass p-4 sm:p-6 text-center group hover:border-[var(--accent)] transition-all duration-300 rounded-xl"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-[var(--accent)]/10 to-transparent">
                <stat.icon className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--accent)]" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold gold-gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-[var(--text-secondary)] mb-2">{stat.label}</div>
              <div
                className={`text-xs px-2 py-1 rounded-full inline-block ${
                  stat.change.includes("+") ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {stat.change}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-8 lg:px-12 w-full max-w-screen-2xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            <span className="gold-gradient-text">Privacy-First</span> Platform
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Built for security researchers, privacy advocates, and Zcash enthusiasts
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="card-glass p-6 sm:p-8 group hover:border-[var(--accent)] transform transition-all duration-500 rounded-xl"
            >
              <div className="mb-4 sm:mb-6">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 sm:mb-6`}>
                  <feature.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-[var(--text)]">{feature.title}</h3>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">{feature.description}</p>
              </div>
              <div className="pt-4 border-t border-[var(--border)] group-hover:border-[var(--accent)] transition-colors">
                <span className="text-sm text-[var(--accent)] font-medium inline-flex items-center gap-2">
                  Learn more <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Open Source Banner */}
      <div className="w-full max-w-screen-2xl mx-auto mt-12 mb-8 px-4 sm:px-8 lg:px-12">
        <div className="card-glass border border-[var(--accent)]/30 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[var(--surface)] to-[var(--surface-glass)]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4 w-full md:w-auto">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-black to-gray-900 flex items-center justify-center">
                  <Github className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-lg sm:text-2xl mb-2 text-[var(--text)]">Fully Open Source</h4>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-xl">
                  Zecrete Explorer is completely open source. Review the code, contribute, or run your own instance.
                </p>
              </div>
            </div>

            <a
              href="https://github.com/Hiesdiego/zecrete-explorer"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center gap-3"
            >
              <Github className="w-4 h-4 sm:w-5 sm:h-5" />
              Star on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Security Banner */}
      <div className="w-full max-w-screen-2xl mx-auto mt-6 mb-8 px-4 sm:px-8 lg:px-12">
        <div className="card-glass border-l-4 border-[var(--accent)] p-6 sm:p-8 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-lg sm:text-2xl mb-2 text-[var(--text)]">Enhanced Privacy Notice</h4>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                All shielded transaction decryption occurs locally in your browser using WebAssembly.
                Your UFVKs and viewing keys never leave your device. Network statistics are aggregated
                and anonymized at the protocol level.
              </p>
              <div className="mt-4 sm:mt-6 px-4 py-3 rounded-xl bg-[var(--panel)] border border-[var(--border)]">
                <span className="font-semibold text-[var(--accent)] flex items-center gap-2 text-sm">
                  🔒 Zero-knowledge privacy • Client-side encryption • Open-source audit
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Status */}
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 mb-16">
        <div className="card-glass p-4 sm:p-6 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-lg sm:text-2xl mb-1">Network Status</h4>
              <p className="text-sm sm:text-base text-[var(--text-secondary)]">All systems operational</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-base font-medium">Live</span>
              </div>

              <div className="h-8 w-full sm:w-px bg-[var(--border)]" aria-hidden />

              <div className="text-sm sm:text-base text-[var(--text-secondary)]">
                Last block: <span className="font-medium text-[var(--accent)]">#2,187,435</span>
              </div>

              <div className="h-8 w-full sm:w-px bg-[var(--border)]" aria-hidden />

              <div className="text-sm sm:text-base text-[var(--text-secondary)]">
                Synced: <span className="font-medium text-green-400">100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
