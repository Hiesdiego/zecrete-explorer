// src/components/ThemeToggle.tsx
"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, ThemeChoice } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg glass animate-pulse">
        <div className="w-8 h-8 rounded-full bg-[var(--muted)]/20" />
      </div>
    );
  }

  const getIcon = () => {
    switch (theme) {
      case "dark": return <Moon className="w-4 h-4" />;
      case "light": return <Sun className="w-4 h-4" />;
      case "system": return <Monitor className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case "dark": return "Dark";
      case "light": return "Light";
      case "system": return "Auto";
    }
  };

  const getTooltip = () => {
    const current = theme === "system" ? `System (${resolvedTheme})` : theme;
    return `Theme: ${current} • Click to cycle`;
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={getTooltip()}
      className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-[var(--panel)] transition-colors group"
    >
      <motion.div
        key={theme}
        initial={{ rotate: -180, scale: 0 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/5" />
        {getIcon()}
      </motion.div>
      
      <div className="hidden sm:block text-left">
        <div className="text-sm font-medium flex items-center gap-2">
          {getLabel()}
          {theme === "system" && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">
              {resolvedTheme}
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--muted)]">
          Click to cycle
        </div>
      </div>
    </motion.button>
  );
}