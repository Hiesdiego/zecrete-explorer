// src/hooks/useTheme.ts
"use client";
import { useEffect, useState, useCallback } from "react";
import { eventBus } from "@/lib/eventBus";

const STORAGE_KEY = "zecrete:theme";

export type ThemeChoice = "dark" | "light" | "system";

export function useTheme() {
  // Initialize from localStorage synchronously on first render (safe on client)
  const [theme, setTheme] = useState<ThemeChoice>(() => {
    if (typeof window === "undefined") return "system";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return (raw as ThemeChoice) || "system";
    } catch {
      return "system";
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return theme === "system" ? (prefersDark ? "dark" : "light") : (theme === "dark" ? "dark" : "light");
  });

  const [isInitialized, setIsInitialized] = useState(false);

  const applyTheme = useCallback((t: ThemeChoice) => {
    if (typeof window === "undefined") return "light";

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = t === "system" ? (prefersDark ? "dark" : "light") : t;

    // Apply to document
    const root = document.documentElement;

    // Keep class and data-theme in sync
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.dataset.theme = resolved;

    // Ensure color-scheme is set for form controls, scrollbars, etc.
    root.style.setProperty("color-scheme", resolved);

    // Update resolvedTheme state for this hook instance
    setResolvedTheme(resolved);

    // Emit global event with both the choice and resolved theme so other hook instances sync
    try {
      eventBus.emit("theme:changed", { choice: t, resolved });
    } catch (e) {
      // no-op if eventBus fails for any reason
    }

    return resolved;
  }, []);

  // Apply CSS variable overrides for resolvedTheme (keeps your existing variables)
  useEffect(() => {
    const root = document.documentElement;

    if (resolvedTheme === "dark") {
      root.style.setProperty("--bg", "#0a0a0a");
      root.style.setProperty("--surface", "rgba(18, 18, 18, 0.7)");
      root.style.setProperty("--surface-glass", "rgba(18, 18, 18, 0.6)");
      root.style.setProperty("--panel", "rgba(255, 215, 0, 0.03)");
      root.style.setProperty("--muted", "#a0a0a0");
      root.style.setProperty("--accent", "#ffd700");
      root.style.setProperty("--accent-light", "#ffed4e");
      root.style.setProperty("--accent-dark", "#b8860b");
      root.style.setProperty("--accent-glow", "rgba(255, 215, 0, 0.15)");
      root.style.setProperty("--gold", "#ffd700");
      root.style.setProperty("--gold-gradient", "linear-gradient(135deg, #ffd700 0%, #b8860b 100%)");
      root.style.setProperty("--glass-blur", "20px");
      root.style.setProperty("--border", "rgba(255, 215, 0, 0.1)");
      root.style.setProperty("--text", "#ffffff");
      root.style.setProperty("--text-secondary", "#d1d5db");
      root.style.setProperty("--explorer-bg", "linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(20, 20, 30, 0.98) 100%)");
      root.style.setProperty("--explorer-surface", "rgba(30, 30, 40, 0.4)");
    } else {
      root.style.setProperty("--bg", "#ffffff");
      root.style.setProperty("--surface", "rgba(248, 249, 250, 0.8)");
      root.style.setProperty("--surface-glass", "rgba(248, 249, 250, 0.6)");
      root.style.setProperty("--panel", "rgba(212, 175, 55, 0.05)");
      root.style.setProperty("--muted", "#666666");
      root.style.setProperty("--accent", "#d4af37");
      root.style.setProperty("--accent-light", "#f4d03f");
      root.style.setProperty("--accent-dark", "#b8860b");
      root.style.setProperty("--accent-glow", "rgba(212, 175, 55, 0.1)");
      root.style.setProperty("--gold", "#d4af37");
      root.style.setProperty("--gold-gradient", "linear-gradient(135deg, #d4af37 0%, #b8860b 100%)");
      root.style.setProperty("--glass-blur", "16px");
      root.style.setProperty("--border", "rgba(212, 175, 55, 0.15)");
      root.style.setProperty("--text", "#1a1a1a");
      root.style.setProperty("--text-secondary", "#4b5563");
      root.style.setProperty("--explorer-bg", "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 245, 255, 0.98) 100%)");
      root.style.setProperty("--explorer-surface", "rgba(240, 240, 250, 0.4)");
    }
  }, [resolvedTheme]);

  // Initial application on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    applyTheme(theme);
    setIsInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // Persist theme changes and ensure applyTheme is always run when theme state changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      console.warn("Failed to persist theme:", error);
    }

    // ensure the DOM + vars update whenever theme changes in any hook instance
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Listen for OS theme changes when in 'system' mode
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme("system");
    };

    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
    } else {
      mq.addListener(handler);
    }

    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener("change", handler);
      } else {
        mq.removeListener(handler);
      }
    };
  }, [theme, applyTheme]);

  // Sync between multiple hook instances via eventBus and across tabs via storage event.
  useEffect(() => {
    // eventBus handler: payload may be string (old emit) or object { choice, resolved }
    const off = eventBus.on("theme:changed", (payload: any) => {
      if (!payload) return;
      if (typeof payload === "string") {
        // backward compatibility: payload is resolved theme string ("dark"|"light")
        const incomingResolved = payload as "dark" | "light";
        setResolvedTheme(incomingResolved);
        // keep user-chosen theme unless storage says otherwise; read storage if present
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) setTheme(raw as ThemeChoice);
        } catch {}
        return;
      }

      const { choice, resolved } = payload as { choice?: ThemeChoice; resolved?: "dark" | "light" };

      if (choice && choice !== theme) {
        setTheme(choice);
      }
      if (resolved && resolved !== resolvedTheme) {
        setResolvedTheme(resolved);
      }
    });

    // storage event for cross-tab sync
    const storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const newVal = (e.newValue as ThemeChoice) || "system";
        // apply and update local state
        setTheme(newVal);
        applyTheme(newVal);
      }
    };

    window.addEventListener("storage", storageHandler);
    return () => {
      off();
      window.removeEventListener("storage", storageHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyTheme, theme, resolvedTheme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const themes: ThemeChoice[] = ["dark", "light", "system"];
      const currentIndex = themes.indexOf(current);
      const nextIndex = (currentIndex + 1) % themes.length;
      const next = themes[nextIndex];

      // apply immediately so all instances see the change via eventBus
      try {
        applyTheme(next);
      } catch (e) {
        // fallback: just set state
      }

      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyTheme]);

  const setThemeDirect = useCallback((t: ThemeChoice) => {
    setTheme(() => {
      try {
        applyTheme(t);
      } catch {}
      try {
        localStorage.setItem(STORAGE_KEY, t);
      } catch {}
      return t;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyTheme]);

  return {
    theme,
    setTheme: setThemeDirect,
    toggleTheme,
    resolvedTheme,
    isDark: resolvedTheme === "dark",
    isLight: resolvedTheme === "light",
    isSystem: theme === "system",
    isInitialized,
  };
}
