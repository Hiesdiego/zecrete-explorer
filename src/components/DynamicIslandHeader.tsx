"use client";

import Link from "next/link";
import {
  Home,
  Compass,
  BarChart,
  Book,
  Github,
  Globe,
  User,
  Bell,
  ChevronDown,
  Menu,
  X,
  Key,
  RefreshCw,
  Search,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import Image from "next/image";
import { eventBus } from "@/lib/eventBus";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import { usePrice } from "@/context/PriceProvider";
import { useSession } from "@/context/SessionProvider";

export default function DynamicIslandHeader() {
  const { isDark, resolvedTheme } = useTheme();
  const { unlockedKeys } = useSession();
  const { price, loading, refresh } = usePrice();
  const pathname = usePathname();

  // UI states
  const [query, setQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Force re-render on theme change
  const [, setThemeTick] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Theme change re-render
  useEffect(() => {
    const off = eventBus.on("theme:changed", () => {
      setThemeTick((t) => t + 1);
    });
    return () => off();
  }, []);

  function emitSearch(q: string) {
    eventBus.emit("search:query", q.trim());
  }

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/explorer", label: "Explorer", icon: Compass },
    { href: "/docs", label: "Documentation", icon: Book },
    { href: "/prod", label: "Production Content", icon: BarChart },
  ];

  const activeItem =
    navItems.find((item) => pathname === item.href) || navItems[0];

  // ✅ IMPORTANT: only return AFTER hooks have run
  const hideHeader = pathname === "/";

  if (hideHeader) return null;

  return (
    <>
      
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-auto">
        <div
          className={`relative transition-all duration-500 ${
            scrolled ? "scale-95 opacity-90" : "scale-100 opacity-100"
          }`}
        >
          <div
            className={`
              relative rounded-2xl md:rounded-full
              border border-[var(--border)] shadow-2xl shadow-black/30
              backdrop-blur-xl backdrop-saturate-200
              transition-all duration-500
              ${isSearchExpanded ? "w-screen max-w-4xl" : "w-auto"}
              ${scrolled ? "scale-95" : "scale-100"}
            `}
            style={{ background: "var(--surface)" }}
          >
            {/* Glow layers */}
            <div className="absolute inset-0 rounded-2xl md:rounded-full bg-gradient-to-b from-white/10 to-transparent" />
            <div
              className="absolute inset-0 rounded-2xl md:rounded-full"
              style={{ background: "var(--accent)", opacity: 0.05 }}
            />

            {/* Content */}
            <div className="relative flex items-center justify-between p-1.5 md:p-2">
              {/* Left: Logo & Page */}
              <div className="flex items-center gap-2 pl-2 pr-3">
                <Link
                  href="/"
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform overflow-hidden"
                  style={{ background: "var(--surface)" }}
                >
                  <Image
                    src="/assets/zecreteLogo.png"
                    alt="Zecrete Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </Link>

                <div
                  className="hidden md:flex items-center gap-2 pl-3 pr-3 py-1.5 rounded-full"
                  style={{ background: "var(--surface)" }}
                >
                  <activeItem.icon className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span className="text-sm font-medium">
                    {activeItem.label}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[var(--text-secondary)]" />
                </div>
              </div>

              {/* Middle: Quick Actions & Search */}
              <div className="flex items-center gap-1">
                <div className="hidden md:flex items-center gap-1">
                  <button
                    onClick={() => eventBus.emit("modal:unlock")}
                    className="p-2 rounded-full hover:bg-white/5 transition-colors"
                    title="Manage Keys"
                  >
                    <Key className="w-4 h-4" />
                  </button>

                  <button
                    onClick={refresh}
                    disabled={loading}
                    className="p-2 rounded-full hover:bg-white/5 transition-colors disabled:opacity-50"
                    title="Refresh Price"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>

                  <div
                    className="px-2 py-1 rounded-full text-center text-xs font-medium"
                    style={{ background: "var(--surface)" }}
                  >
                    ZEC ${price.usd?.toFixed(2) || "..."}
                  </div>
                </div>

                {/* Search */}
                <div
                  className={`relative transition-all duration-300 ${
                    isSearchExpanded ? "w-64 md:w-80" : "w-8"
                  }`}
                >
                  <div className="relative">
                    <input
                      value={query}
                      type="text"
                      onChange={(e) => {
                        setQuery(e.target.value);
                        emitSearch(e.target.value);
                      }}
                      onFocus={() => setIsSearchExpanded(true)}
                      onBlur={() =>
                        setTimeout(() => setIsSearchExpanded(false), 200)
                      }
                      placeholder={
                        isSearchExpanded
                          ? "Search txid, address, memo..."
                          : ""
                      }
                      className={`w-full bg-transparent border-0 outline-none transition-all duration-300 ${
                        isSearchExpanded
                          ? "opacity-100 px-3 py-1.5"
                          : "opacity-0 w-0"
                      }`}
                    />
                    <button
                      onClick={() =>
                        setIsSearchExpanded((prev) => !prev)
                      }
                      className={`
                        absolute top-1/2 -translate-y-1/2
                        w-8 h-8 rounded-full flex items-center justify-center
                        hover:bg-white/5 transition-colors
                        ${isSearchExpanded ? "right-2" : "right-0"}
                      `}
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Theme + Menu */}
              <div className="flex items-center gap-1">
                <a
                  href="https://github.com/Hiesdiego/zecrete-explorer"
                  target="_blank"
                  className="p-2 rounded-full hover:bg-white/5 transition-colors hidden md:flex"
                >
                  <Github className="w-4 h-4" />
                </a>

                <div className="p-1.5">
                  <ThemeToggle />
                </div>

                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors md:hidden"
                >
                  {isMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </button>

                <div className="hidden md:flex items-center gap-1">
                  <button className="p-2 rounded-full hover:bg-white/5 transition-colors">
                    <Bell className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-white/5 transition-colors">
                    <Globe className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center">
                    <User className="w-4 h-4 text-black" />
                  </div>
                </div>
              </div>
            </div>

            {/* Key Count Badge */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <div
                className="px-2 py-0.5 rounded-full text-black text-xs font-bold flex items-center gap-1"
                style={{ background: "var(--accent)" }}
              >
                <Key className="w-3 h-3" />
                <span>{unlockedKeys.length}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE MENU */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />

          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm">
            <div
              className="rounded-2xl p-6 animate-in slide-in-from-top-4"
              style={{ background: "var(--surface)" }}
            >
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl" style={{ background: "var(--surface)" }}>
                  <div className="text-xs text-[var(--text-secondary)]">ZEC Price</div>
                  <div className="text-lg font-bold gold-gradient-text">
                    ${price.usd?.toFixed(2) || "..."}
                  </div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: "var(--surface)" }}>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Active Keys
                  </div>
                  <div className="text-lg font-bold text-[var(--accent)]">
                    {unlockedKeys.length}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`
                        flex items-center gap-3 p-3 rounded-xl transition-all
                        ${
                          isActive
                            ? "bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30"
                            : "hover:bg-white/5"
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-[var(--accent)]" />
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-3">
                <button
                  onClick={() => {
                    eventBus.emit("modal:unlock");
                    setIsMenuOpen(false);
                  }}
                  className="w-full py-3 rounded-xl btn-gold font-semibold flex items-center justify-center gap-2"
                >
                  <Key className="w-5 h-5" />
                  Manage Keys
                </button>

                <a
                  href="https://github.com/Hiesdiego/zecrete-explorer"
                  target="_blank"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full py-3 rounded-xl border border-gray-600 text-white font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                >
                  <Github className="w-5 h-5" />
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </>
      )}

      {/* DESKTOP NAV MENU */}
      <nav className="fixed top-[7rem] left-1/2 -translate-x-1/2 z-40 hidden md:block">
        <div
          className="rounded-2xl p-2 shadow-2xl shadow-black/20"
          style={{ background: "var(--surface)" }}
        >
          <div className="flex items-center gap-1">
            {navItems.slice(1).map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-all
                    ${
                      isActive
                        ? "bg-[var(--accent)] text-black"
                        : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-white/5"
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </div>
                </Link>
              );
            })}

            <a
              href="https://github.com/Hiesdiego/zecrete-explorer"
              target="_blank"
              className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-white/5 transition-all flex items-center gap-2"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>
        </div>
      </nav>
    </>
  );
}
