//src/components/PanicButton.tsx
"use client";
import React, { useState } from "react";
import { scrubAllData } from "@/lib/vault";
import { AlertTriangle, ShieldOff, Loader2 } from "lucide-react";

export default function PanicButton() {
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handle() {
    if (!confirmed) {
      setConfirmed(true);
      setTimeout(() => setConfirmed(false), 5000);
      return;
    }
 
    if (!window.confirm("⚠️ FINAL WARNING: This will permanently delete ALL local data including keys, transactions, and notes. Continue?")) {
      setConfirmed(false);
      return;
    }

    setBusy(true);
    try {
      await scrubAllData();
      // Show success state briefly before reload
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      alert("Failed to scrub data: " + String(err));
      setBusy(false);
      setConfirmed(false);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={busy}
      className={`
        relative overflow-hidden group
        flex items-center gap-2 px-4 py-3 rounded-xl
        transition-all duration-300 font-semibold
        ${busy ? 'bg-rose-600' : confirmed ? 'bg-amber-600' : 'bg-gradient-to-r from-rose-600 to-rose-800'}
        hover:from-rose-700 hover:to-rose-900
        disabled:opacity-70
        shadow-lg hover:shadow-xl
      `}
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      
      {busy ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Scrubbing...</span>
        </>
      ) : confirmed ? (
        <>
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          <span>Click Again to Confirm</span>
        </>
      ) : (
        <>
          <ShieldOff className="w-4 h-4" />
          <span>Emergency Scrub</span>
        </>
      )}
      
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-rose-500/20 blur-xl -z-10 group-hover:bg-rose-500/30 transition-colors" />
    </button>
  );
}