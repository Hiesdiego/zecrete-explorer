// Multi-key encrypted vault using WebCrypto (AES-GCM + PBKDF2).
// Defensive improvements: robust JSON parsing, persisted flags, and events.

import type { EncryptedVault, WalletKey } from "./types";
import { eventBus } from "@/lib/eventBus";

const STORAGE_KEYS = {
  vaultIndex: "zecrete:vault:index",
  vaultPrefix: "zecrete:vault:key:",
  session: "zecrete:vault:session",
  metadata: "zecrete:vault:meta",
  preferences: "zecrete:prefs",
  hasKeyFlag: "zecrete:hasKey",
  lastKeyId: "zecrete:lastKeyId",
} as const;

const CRYPTO_CONFIG = {
  algorithm: "AES-GCM",
  keyLength: 256,
  pbkdf2Iterations: 200_000,
  saltLength: 16,
  ivLength: 12,
} as const;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.document !== "undefined";
}

function hasLocalStorage(): boolean {
  return isBrowser() && typeof window.localStorage !== "undefined";
}

function hasSessionStorage(): boolean {
  return isBrowser() && typeof window.sessionStorage !== "undefined";
}

function hasIndexedDB(): boolean {
  return isBrowser() && typeof window.indexedDB !== "undefined";
}

function hasNavigator(): boolean {
  return isBrowser() && typeof window.navigator !== "undefined";
}

function hasCaches(): boolean {
  return isBrowser() && typeof window.caches !== "undefined";
}

function getSubtle(): SubtleCrypto {
  if (!isBrowser() || !globalThis.crypto?.subtle) {
    throw new Error("WebCrypto API not available. This function must run in the browser (HTTPS or localhost).");
  }
  return globalThis.crypto.subtle;
}

/* Robust base64 helpers (chunked) to avoid call-stack issues on large buffers */
function bufToB64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(sub) as any);
  }
  return btoa(binary);
}
function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function genSalt(bytes = CRYPTO_CONFIG.saltLength): Uint8Array {
  if (!isBrowser()) throw new Error("Random generation requires browser crypto");
  return crypto.getRandomValues(new Uint8Array(bytes));
}
function genIV(bytes = CRYPTO_CONFIG.ivLength): Uint8Array {
  if (!isBrowser()) throw new Error("Random generation requires browser crypto");
  return crypto.getRandomValues(new Uint8Array(bytes));
}
function genKeyId(): string {
  return `key_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtle();
  const passwordKey = await subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: CRYPTO_CONFIG.pbkdf2Iterations, hash: "SHA-256" },
    passwordKey,
    { name: CRYPTO_CONFIG.algorithm, length: CRYPTO_CONFIG.keyLength },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(plaintext: string, password: string): Promise<EncryptedVault> {
  const subtle = getSubtle();
  const salt = genSalt();
  const iv = genIV();
  const key = await deriveKey(password, salt);
  const ciphertext = await subtle.encrypt({ name: CRYPTO_CONFIG.algorithm, iv }, key, encoder.encode(plaintext));
  return {
    version: 1,
    salt: bufToB64(salt.buffer),
    iv: bufToB64(iv.buffer),
    ciphertext: bufToB64(ciphertext),
    createdAt: Date.now()
  };
}

/**
 * decryptData
 * - Throws a descriptive Error on failure so callers can surface the real cause.
 */
export async function decryptData(vault: EncryptedVault, password: string): Promise<string> {
  try {
    const subtle = getSubtle();
    if (!vault || !vault.salt || !vault.iv || !vault.ciphertext) {
      throw new Error("Malformed vault object (missing fields)");
    }
    const salt = new Uint8Array(b64ToBuf(vault.salt));
    const iv = new Uint8Array(b64ToBuf(vault.iv));
    const ciphertext = b64ToBuf(vault.ciphertext);
    const key = await deriveKey(password, salt);
    const plaintext = await subtle.decrypt({ name: CRYPTO_CONFIG.algorithm, iv }, key, ciphertext);
    return decoder.decode(plaintext);
  } catch (error: any) {
    // Provide a clearer error message for callers and log the underlying error
    console.error("decryptData: decryption failed:", error);
    throw new Error(error?.message ?? "Decryption failed");
  }
}

/* ---------------------------
   Helper utilities
   --------------------------- */

function safeJSONParse<T = any>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn("safeJSONParse: failed parsing JSON, returning fallback", e);
    return fallback;
  }
}

function setHasKeyFlag(keyId?: string) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.hasKeyFlag, "1");
    if (keyId) localStorage.setItem(STORAGE_KEYS.lastKeyId, keyId);
  } catch (e) {
    console.warn("setHasKeyFlag failed", e);
  }
}

function clearHasKeyFlag() {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEYS.hasKeyFlag);
    localStorage.removeItem(STORAGE_KEYS.lastKeyId);
  } catch (e) {
    console.warn("clearHasKeyFlag failed", e);
  }
}

/* ---------------------------
   Vault API
   --------------------------- */

export async function importWalletKey(ufvk: string, password: string, name?: string, color?: string): Promise<WalletKey> {
  if (!hasLocalStorage()) throw new Error("importWalletKey must run in the browser");
  const keyId = genKeyId();
  const walletKey: WalletKey = {
    id: keyId,
    name: name || `Wallet ${keyId.slice(-4)}`,
    ufvk,
    color: color || generateRandomColor(),
    createdAt: Date.now(),
  };

  // Encrypt the UFVK and store
  const vault = await encryptData(ufvk, password);
  const storageKey = STORAGE_KEYS.vaultPrefix + keyId;
  try {
    localStorage.setItem(storageKey, JSON.stringify(vault));
  } catch (e) {
    console.error("importWalletKey: failed to write vault to localStorage", e);
    throw new Error("Failed to persist vault");
  }

  // Verify round-trip immediately to catch any storage/encoding issues
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) throw new Error("Vault write verification failed (missing)");
    const parsed: EncryptedVault = JSON.parse(raw);
    const round = await decryptData(parsed, password);
    if (round !== ufvk) {
      // mismatch — remove stored vault and fail
      localStorage.removeItem(storageKey);
      throw new Error("Vault verification failed after write");
    }
  } catch (e) {
    // cleanup and rethrow
    try { localStorage.removeItem(storageKey); } catch {}
    console.error("importWalletKey: verification failed", e);
    throw e;
  }

  // Update index (defensively)
  const indexRaw = localStorage.getItem(STORAGE_KEYS.vaultIndex);
  const index = safeJSONParse<Record<string, Partial<WalletKey>>>(indexRaw, {});
  index[keyId] = {
    name: walletKey.name,
    color: walletKey.color,
    createdAt: walletKey.createdAt
  };
  try {
    localStorage.setItem(STORAGE_KEYS.vaultIndex, JSON.stringify(index));
  } catch (e) {
    console.warn("Failed to write vault index", e);
  }

  // persist UI flag
  setHasKeyFlag(keyId);

  // Emit event for consumers (UnlockModal, Explorer, etc.)
  try {
    eventBus.emit("vault:key-added", { keyId, meta: index[keyId] });
  } catch (e) {
    console.warn("vault:key-added emit failed", e);
  }

  return walletKey;
}

export async function unlockWalletKey(keyId: string, password: string): Promise<string> {
  if (!hasLocalStorage()) throw new Error("unlockWalletKey must run in the browser");
  const storageKey = STORAGE_KEYS.vaultPrefix + keyId;
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    const msg = `Vault not found for key: ${keyId}`;
    console.error(msg);
    throw new Error(msg);
  }
  try {
    const vault: EncryptedVault = JSON.parse(raw);
    const decrypted = await decryptData(vault, password);
    return decrypted;
  } catch (e: any) {
    console.error("unlockWalletKey: failed to decrypt or parse vault", e);
    throw new Error(e?.message ?? "Failed to unlock wallet key");
  }
}

export function getVaultIndex(): Record<string, Partial<WalletKey>> {
  if (!hasLocalStorage()) {
    // Server or environment without localStorage: return empty index
    return {};
  }
  const raw = localStorage.getItem(STORAGE_KEYS.vaultIndex);
  return safeJSONParse<Record<string, Partial<WalletKey>>>(raw, {});
}

export function getAllWalletKeys(): Partial<WalletKey>[] {
  const index = getVaultIndex();
  return Object.entries(index).map(([id, data]) => ({ id, ...data }));
}

export async function deleteWalletKey(keyId: string): Promise<void> {
  if (!hasLocalStorage()) {
    // no-op on server
    return;
  }
  const storageKey = STORAGE_KEYS.vaultPrefix + keyId;
  localStorage.removeItem(storageKey);
  const index = getVaultIndex();
  delete index[keyId];
  try {
    localStorage.setItem(STORAGE_KEYS.vaultIndex, JSON.stringify(index));
  } catch (e) {
    console.warn("deleteWalletKey: failed to update index", e);
  }

  // Update flags: if no keys left, clear the hasKey flag
  try {
    const remaining = Object.keys(index).length;
    if (remaining === 0) {
      clearHasKeyFlag();
    } else {
      // set lastKeyId to an existing key
      const last = Object.keys(index)[0];
      if (last) localStorage.setItem(STORAGE_KEYS.lastKeyId, last);
    }
  } catch (e) {
    console.warn("deleteWalletKey: failed to update flags", e);
  }

  // Remove from session
  if (hasSessionStorage()) {
    const session = getSessionKeys();
    const updated = session.filter(s => s.keyId !== keyId);
    try {
      sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify(updated));
    } catch (e) {
      console.warn("deleteWalletKey: failed to update sessionStorage", e);
    }
  }

  // emit removal event
  try {
    eventBus.emit("vault:key-removed", { keyId });
  } catch (e) {
    console.warn("vault:key-removed emit failed", e);
  }
}

export async function updateWalletKeyName(keyId: string, name: string): Promise<void> {
  if (!hasLocalStorage()) return;
  const index = getVaultIndex();
  if (index[keyId]) {
    index[keyId].name = name;
    try {
      localStorage.setItem(STORAGE_KEYS.vaultIndex, JSON.stringify(index));
    } catch (e) {
      console.warn("updateWalletKeyName: failed to write index", e);
    }
  }
}

interface SessionKey {
  keyId: string;
  ufvk: string;
  unlockedAt: number;
  expiresAt: number;
}

let autoLockTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Unlock the session for a key — made async so callers can await storage write and emitted event.
 */
export async function unlockSession(keyId: string, ufvk: string, minutes = 10): Promise<void> {
  if (!hasSessionStorage()) {
    console.warn("unlockSession: sessionStorage not available; skipping");
    return;
  }
  const session: SessionKey[] = getSessionKeys();
  const expiresAt = Date.now() + minutes * 60_000;
  const filtered = session.filter(s => s.keyId !== keyId);
  filtered.push({ keyId, ufvk, unlockedAt: Date.now(), expiresAt });
  try {
    sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify(filtered));
  } catch (e) {
    console.warn("unlockSession: failed to write sessionStorage", e);
  }
  resetAutoLock(minutes);

  // emit event so UI can react if needed
  try { eventBus.emit("session:unlocked", { keyId, ufvk }); } catch (e) { /* ignore */ }
}

export function getUnlockedKey(keyId: string): string | null {
  if (!hasSessionStorage()) return null;
  const sessions = getSessionKeys();
  const session = sessions.find(s => s.keyId === keyId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    lockSession(keyId);
    return null;
  }
  return session.ufvk;
}

export function getAllUnlockedKeys(): SessionKey[] {
  if (!hasSessionStorage()) return [];
  const sessions = getSessionKeys();
  const now = Date.now();
  const active = sessions.filter(s => s.expiresAt > now);
  if (active.length !== sessions.length) {
    try {
      sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify(active));
    } catch (e) {
      console.warn("getAllUnlockedKeys: failed to update sessionStorage", e);
    }
  }
  return active;
}

function getSessionKeys(): SessionKey[] {
  if (!hasSessionStorage()) return [];
  const raw = sessionStorage.getItem(STORAGE_KEYS.session);
  return safeJSONParse<SessionKey[]>(raw, []);
}

export function lockSession(keyId?: string): void {
  if (!hasSessionStorage()) return;
  if (keyId) {
    const sessions = getSessionKeys();
    const filtered = sessions.filter(s => s.keyId !== keyId);
    try {
      sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify(filtered));
    } catch (e) {
      console.warn("lockSession: failed to write sessionStorage", e);
    }
  } else {
    try {
      sessionStorage.removeItem(STORAGE_KEYS.session);
    } catch (e) {
      console.warn("lockSession: failed to clear sessionStorage", e);
    }
    clearAutoLock();
  }
}

export function lockAllSessions(): void {
  if (!hasSessionStorage()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEYS.session);
  } catch (e) {
    console.warn("lockAllSessions: failed to remove sessionStorage", e);
  }
  clearAutoLock();
}

function resetAutoLock(minutes: number): void {
  clearAutoLock();
  if (!isBrowser()) return;
  autoLockTimer = setTimeout(() => {
    lockAllSessions();
    console.log("Auto-lock triggered");
  }, minutes * 60_000);
}

function clearAutoLock(): void {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }
}

export function getRemainingLockTime(keyId: string): number {
  if (!hasSessionStorage()) return 0;
  const sessions = getSessionKeys();
  const session = sessions.find(s => s.keyId === keyId);
  if (!session) return 0;
  return Math.max(0, session.expiresAt - Date.now());
}

export async function scrubAllData(): Promise<void> {
  try {
    if (!isBrowser()) {
      console.warn("scrubAllData called outside browser; skipping");
      return;
    }

    // Clear localStorage keys that start with zecrete:
    if (hasLocalStorage()) {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("zecrete:")) {
          localStorage.removeItem(key);
        }
      });
    }

    // Clear sessionStorage
    if (hasSessionStorage()) {
      sessionStorage.clear();
    }

    // Clear IndexedDB
    if (hasIndexedDB()) {
      const dbs = await (indexedDB as any).databases?.() || [];
      for (const db of dbs) {
        if (db.name?.startsWith("zecrete")) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }

    // Unregister service workers
    if (hasNavigator() && "serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    // Clear caches
    if (hasCaches()) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        if (cacheName.startsWith("zecrete")) {
          await caches.delete(cacheName);
        }
      }
    }

    // Clear persistent flags and notify app
    clearHasKeyFlag();
    try { eventBus.emit("vault:cleared"); } catch (e) { console.warn("vault:cleared emit failed", e); }

    console.log("✅ All data scrubbed successfully");
  } catch (error) {
    console.error("❌ Error during data scrub:", error);
    throw error;
  }
}

function generateRandomColor(): string {
  const colors = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#14b8a6"];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function exportVault(password: string): string {
  const index = getVaultIndex();
  const vaults: Record<string, any> = {};
  if (hasLocalStorage()) {
    Object.keys(index).forEach((keyId) => {
      const storageKey = STORAGE_KEYS.vaultPrefix + keyId;
      const vault = localStorage.getItem(storageKey);
      if (vault) {
        vaults[keyId] = safeJSONParse(vault, vault);
      }
    });
  }
  return JSON.stringify({ index, vaults }, null, 2);
}

export async function importVault(vaultData: string, password: string): Promise<void> {
  if (!hasLocalStorage()) throw new Error("importVault must run in the browser");
  const { index, vaults } = JSON.parse(vaultData);
  const firstKeyId = Object.keys(vaults)[0];
  const testDecrypt = await decryptData(vaults[firstKeyId], password);
  if (!testDecrypt) {
    throw new Error("Invalid password for vault import");
  }
  Object.entries(vaults).forEach(([keyId, vault]) => {
    const storageKey = STORAGE_KEYS.vaultPrefix + keyId;
    localStorage.setItem(storageKey, JSON.stringify(vault));
  });
  localStorage.setItem(STORAGE_KEYS.vaultIndex, JSON.stringify(index));

  // set UI flags and emit events for each key
  const someKey = Object.keys(index)[0];
  if (someKey) setHasKeyFlag(someKey);
  try {
    Object.keys(index).forEach(k => {
      try { eventBus.emit("vault:key-added", { keyId: k, meta: index[k] }); } catch (e) { /* ignore */ }
    });
  } catch (e) {
    console.warn("importVault: failed to emit key-added events", e);
  }

  console.log("✅ Vault imported successfully");
}
