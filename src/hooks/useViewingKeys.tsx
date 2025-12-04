// src/hooks/useViewingKeys.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import type { WalletKey } from "@/lib/types";
import { importWalletKey, getAllWalletKeys, unlockWalletKey, getVaultIndex } from "@/lib/vault";

export function useViewingKeys() {
  const [keys, setKeys] = useState<Partial<WalletKey>[]>([]);
  const [unlocked, setUnlocked] = useState<Record<string,string>>({});

  useEffect(() => {
    setKeys(getAllWalletKeys());
  }, []);

  const refresh = useCallback(() => setKeys(getAllWalletKeys()), []);

  const addKey = useCallback(async (ufvk: string, password: string, name?: string) => {
    const k = await importWalletKey(ufvk, password, name);
    refresh();
    return k;
  }, [refresh]);

  const unlock = useCallback(async (keyId: string, password: string) => {
    const ufvk = await unlockWalletKey(keyId, password);
    if (ufvk) {
      setUnlocked(prev => ({ ...prev, [keyId]: ufvk }));
      return ufvk;
    }
    return null;
  }, []);

  const lock = useCallback((keyId: string) => {
    setUnlocked(prev => {
      const next = { ...prev };
      delete next[keyId];
      return next;
    });
  }, []);

  return { keys, unlocked, addKey, unlock, lock, refresh };
}
