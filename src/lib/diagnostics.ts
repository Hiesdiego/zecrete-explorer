// src/lib/diagnostics.ts
export type KeyHealth = {
  keyId: string;
  entropyScore: number;
  pastejackSuspected: boolean;
  patternRisk: "low" | "medium" | "high";
  warnings: string[];
};

export function analyzeViewingKey(ufvk: string): KeyHealth {
  const keyId = deriveKeyId(ufvk);
  const entropyScore = estimateEntropy(ufvk);
  const pastejackSuspected = detectPasteJack(ufvk);
  const patternRisk = entropyScore < 0.6 ? "high" : entropyScore < 0.8 ? "medium" : "low";
  const warnings = [];
  if (pastejackSuspected) warnings.push("Viewing key may be paste-jacked.");
  if (entropyScore < 0.6) warnings.push("Weak entropy detected.");
  if (/password|test|1234/i.test(ufvk)) warnings.push("Key contains common patterns.");
  return { keyId, entropyScore, pastejackSuspected, patternRisk, warnings };
}

function deriveKeyId(ufvk: string): string {
  let h = 0;
  for (let i = 0; i < ufvk.length; i++) h = (h * 33 + ufvk.charCodeAt(i)) >>> 0;
  return `key_${h.toString(16)}`;
}

function estimateEntropy(s: string) {
  const unique = new Set(s.split("")).size;
  const diversity = unique / Math.min(128, s.length);
  return Math.max(0.1, Math.min(1.0, diversity));
}

function detectPasteJack(ufvk: string) {
  const hasNonPrintable = /[^\x20-\x7E]/.test(ufvk);
  const looksClipped = ufvk.length < 80;
  return hasNonPrintable || looksClipped;
}
