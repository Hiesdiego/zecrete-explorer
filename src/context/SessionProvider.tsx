// src/context/SessionProvider.tsx
"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAllUnlockedKeys, getVaultIndex } from "@/lib/vault";
import type { WalletKey } from "@/lib/types";

/**
 * SessionProvider
 * - Exposes unlocked session info and utilities to derive notebook passphrase.
 * - Uses current unlocked UFVK (from session storage via vault.getAllUnlockedKeys()).
 *
 * deriveNotebookPassphrase(ufvk): returns hex(SHA-256(ufvk)) as stable passphrase.
 */

type SessionContextValue = {
  unlockedKeys: { keyId: string; ufvk: string }[];
  activeKey: { id: string; name?: string; ufvk?: string } | null;
  refresh: () => void;
  deriveNotebookPassphrase: (ufvk: string) => Promise<string>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [unlockedKeys, setUnlockedKeys] = useState<{ keyId: string; ufvk: string }[]>([]);
  const [activeKey, setActiveKey] = useState<{ id: string; name?: string; ufvk?: string } | null>(null);

  function refresh() {
    try {
      const sessions = getAllUnlockedKeys(); // returns SessionKey[] with ufvk
      const mapped = sessions.map((s: any) => ({ keyId: s.keyId, ufvk: s.ufvk }));
      setUnlockedKeys(mapped);
      if (mapped.length > 0) {
        const index = getVaultIndex();
        const meta = index[mapped[0].keyId] || {};
        setActiveKey({ id: mapped[0].keyId, name: meta.name, ufvk: mapped[0].ufvk });
      } else {
        setActiveKey(null);
      }
    } catch (err) {
      setUnlockedKeys([]);
      setActiveKey(null);
    }
  }

  useEffect(() => {
    refresh();
    // Detect sessionStorage changes in other tabs (best-effort)
    function onStorage(e: StorageEvent) {
      if (e.key && e.key.includes("zecrete:vault:session")) refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function deriveNotebookPassphrase(ufvk: string) {
    // Derive stable passphrase: SHA-256(ufvk) hex. This is used as password for encryptData/decryptData.
    const enc = new TextEncoder();
    const data = enc.encode(ufvk);
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    const hex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    return hex;
  }

  const value = useMemo(() => ({
    unlockedKeys,
    activeKey,
    refresh,
    deriveNotebookPassphrase,
  }), [unlockedKeys, activeKey]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
