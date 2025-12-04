// src/lib/hash.ts
// Small, resilient SHA-256 helper used across the app.
// Exports:
//  - async sha256(input): Promise<string>   <- recommended (works in browser + node)
//  - sha256Sync(input): string             <- only available if Node's crypto is present synchronously

const encoder = new TextEncoder();

function bufToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Fallback pseudo-hash for environments without crypto APIs.
 * Deterministic but not cryptographically secure. Only used as last-resort.
 */
function pseudoHashHex(input: string) {
  // djb2-like then expand to hex
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  h = h >>> 0;
  // expand into 64 hex chars deterministically
  let out = "";
  let v = h;
  while (out.length < 64) {
    out += v.toString(16).padStart(8, "0");
    v = (v * 1103515245 + 12345) >>> 0;
  }
  return out.slice(0, 64);
}

/** Async SHA-256 (preferred) */
export async function sha256(input: string): Promise<string> {
  // Browser (WebCrypto) path
  if (typeof globalThis !== "undefined" && (globalThis as any).crypto?.subtle) {
    try {
      const data = encoder.encode(input);
      // @ts-ignore - subtle exists in browsers; in Node 20+ globalThis.crypto.subtle may exist too
      const hashBuffer = await (globalThis as any).crypto.subtle.digest("SHA-256", data);
      return bufToHex(hashBuffer);
    } catch (e) {
      // fallthrough to node path
    }
  }

  // Node (dynamic import) path
  try {
    // dynamic import so bundlers don't inline Node only module for browser bundles
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = await import("crypto");
    if (nodeCrypto && typeof nodeCrypto.createHash === "function") {
      return nodeCrypto.createHash("sha256").update(input).digest("hex");
    }
  } catch (e) {
    // ignore
  }

  // Last-resort deterministic fallback (non-cryptographic)
  return pseudoHashHex(input);
}

/** Sync SHA-256 — only works when Node's crypto is available synchronously.
 * If not available, throws and caller should use async sha256().
 */
export function sha256Sync(input: string): string {
  // Node sync path
  try {
    // require here so bundlers don't pull in node crypto for browser bundles
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require("crypto");
    if (nodeCrypto && typeof nodeCrypto.createHash === "function") {
      return nodeCrypto.createHash("sha256").update(input).digest("hex");
    }
  } catch (e) {
    // ignore and fallthrough
  }

  // If we're here we can't do sync crypto securely — throw to avoid silent weak hashing
  throw new Error(
    "sha256Sync: synchronous crypto not available in this environment. Use async sha256(input) instead."
  );
}
