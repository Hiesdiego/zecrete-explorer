// src/lib/crypto/key-health.ts
/**
 * Key health analysis
 * -------------------
 * Lightweight, local-only heuristics to determine:
 * - entropyScore (0..1)
 * - paste-jack suspicion
 * - pattern risk (low|medium|high)
 * - human-readable warnings
 *
 * This module is intentionally conservative and explainable so judges/auditors
 * can review the heuristics easily.
 *
 * The functions are synchronous and purely local (no network).
 */

import type { KeyHealth } from "@/lib/types";

/**
 * Estimate character-class diversity and entropy-like score.
 * Returns 0.1 .. 1.0 (not a cryptographic entropy, but useful for heuristics).
 */
export function estimateEntropy(s: string): number {
  if (!s || s.length === 0) return 0.1;
  const unique = new Set(s.split("")).size;
  const diversity = unique / Math.min(256, Math.max(16, s.length));
  // Character class checks
  const hasLower = /[a-z]/.test(s);
  const hasUpper = /[A-Z]/.test(s);
  const hasDigit = /[0-9]/.test(s);
  const hasSpecial = /[^a-zA-Z0-9]/.test(s);
  const classCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  const classBonus = Math.min(0.25, classCount * 0.06);

  // length bonus saturates to 0.2
  const lengthBonus = Math.min(0.2, s.length / 1024);

  const score = Math.max(0.05, Math.min(1.0, diversity + classBonus + lengthBonus));
  return Number(score.toFixed(3));
}

/** Detect paste-jack style corruption or clipped keys */
export function detectPasteJack(s: string): boolean {
  if (!s) return false;
  // non-printable bytes
  if (/[^\x20-\x7E]/.test(s)) return true;
  // suspicious short length
  if (s.length < 80) return true;
  // weird triple whitespace (likely copy paste artifact)
  if (/\s{3,}/.test(s)) return true;
  return false;
}

/** Basic pattern checks: repeats, sequential runs, common words */
export function detectPatternRisk(s: string): "low" | "medium" | "high" {
  if (!s) return "high";
  const repeats = /(.{3,})\1{2,}/.test(s);
  const sequential = /(?:0123|1234|2345|abcd|bcde|cdef|qrst|qwer)/i.test(s);
  const common = /(password|test|sample|demo|private|secret|1234|qwerty)/i.test(s);

  if (repeats || sequential || common) return "high";
  if (s.length < 120 || s.match(/([A-Za-z0-9])\1\1/)) return "medium";
  return "low";
}

/** Determine overall strength label */
export function determineStrength(entropy: number, warningsCount: number): KeyHealth["strength"] {
  if (warningsCount >= 3 || entropy < 0.5) return "weak";
  if (warningsCount >= 2 || entropy < 0.7) return "moderate";
  if (entropy < 0.85) return "strong";
  return "excellent";
}

/** Generate descriptive warnings */
export function generateWarnings(entropy: number, pastejack: boolean, s: string): string[] {
  const warnings: string[] = [];
  if (pastejack) warnings.push("Key may be paste-jacked or corrupted.");
  if (entropy < 0.5) warnings.push("Low entropy — key may be weak or truncated.");
  if (entropy < 0.7) warnings.push("Moderate entropy — consider regenerating the key from a secure source.");
  if (/password|test|sample|demo|1234|qwerty/i.test(s)) warnings.push("Key contains common weak patterns.");
  if (s.length < 100) warnings.push("Key shorter than typical UFVKs — possible truncation.");
  return warnings;
}

/**
 * Public analyzer — returns a KeyHealth object suitable for UI display.
 * This is deterministic and local.
 */
export function analyzeKeyHealth(ufvk: string): KeyHealth {
  const entropyScore = estimateEntropy(ufvk);
  const pastejackSuspected = detectPasteJack(ufvk);
  const patternRisk = detectPatternRisk(ufvk);
  const warnings = generateWarnings(entropyScore, pastejackSuspected, ufvk);
  const strength = determineStrength(entropyScore, warnings.length);

  return {
    keyId: deriveKeyId(ufvk),
    entropyScore,
    pastejackSuspected,
    patternRisk,
    warnings,
    strength,
  };
}

/** Simple stable key id */
function deriveKeyId(ufvk: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < ufvk.length; i++) {
    h ^= ufvk.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `k_${h.toString(16)}`;
}
