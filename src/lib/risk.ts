// src/lib/risk.ts - Unified Risk Assessment & Privacy Analysis

import type {
  TxRecord,
  RiskAssessment,
  PrivacyMetrics,
  FirewallCheck,
  AntiPhishingCheck,
  KeyHealth,
} from "./types";
import { CONSTANTS, PRIVACY_THRESHOLDS } from "./types";

// ============================================================================
// TRANSACTION RISK ASSESSMENT
// ============================================================================

export function assessTransactionRisk(
  tx: TxRecord,
  allTransactions: TxRecord[]
): RiskAssessment {
  const isDust = Math.abs(tx.amount) < CONSTANTS.DUST_THRESHOLD;
  const memoRisk = calculateMemoRisk(tx.memo);
  const timingLinkability = calculateTimingRisk(tx, allTransactions);
  const anomalyScore = detectAnomalies(tx, allTransactions);

  const warnings: string[] = [];

  if (isDust) warnings.push("Dust transaction detected (< 0.1 ZEC)");
  if (memoRisk > 0.7) warnings.push("Memo content may reduce privacy");
  if (timingLinkability > 0.7) warnings.push("Timing pattern is highly linkable");
  if (anomalyScore > 70) warnings.push("Unusual transaction pattern");
  if (tx.pool === "transparent") warnings.push("Transparent pool has no privacy");

  // Calculate overall privacy score (0-100)
  const baseScore = 100;
  const dustPenalty = isDust ? 15 : 0;
  const memoPenalty = Math.round(memoRisk * 20);
  const timingPenalty = Math.round(timingLinkability * 30);
  const poolBonus = tx.pool === "orchard" ? 10 : tx.pool === "sapling" ? 5 : -20;
  const anomalyPenalty = anomalyScore > 70 ? 15 : 0;

  const privacyScore = Math.max(
    0,
    Math.min(100, baseScore - dustPenalty - memoPenalty - timingPenalty + poolBonus - anomalyPenalty)
  );

  return {
    dust: isDust,
    timingLinkability,
    memoRisk,
    privacyScore,
    anomalyScore,
    warnings,
  };
}

function calculateMemoRisk(memo?: string): number {
  if (!memo || memo.trim().length === 0) return 0.0;

  let risk = 0.1; // Base risk for having any memo

  // Length-based risk
  if (memo.length > CONSTANTS.SAFE_MEMO_LENGTH) {
    risk += 0.3;
  }
  if (memo.length > CONSTANTS.MAX_MEMO_LENGTH * 0.8) {
    risk += 0.2;
  }

  // Content-based risk
  const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(memo);
  const hasPhone = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(memo);
  const hasURL = /https?:\/\/[^\s]+/.test(memo);
  const hasName = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(memo);
  
  if (hasEmail) risk += 0.25;
  if (hasPhone) risk += 0.25;
  if (hasURL) risk += 0.15;
  if (hasName) risk += 0.15;

  // Repeated patterns
  const uniqueChars = new Set(memo.toLowerCase()).size;
  if (uniqueChars < memo.length * 0.3) {
    risk += 0.2; // Low entropy
  }

  return Math.min(1.0, risk);
}

function calculateTimingRisk(
  tx: TxRecord,
  allTransactions: TxRecord[]
): number {
  const sorted = [...allTransactions]
    .sort((a, b) => a.timestamp - b.timestamp);
  
  const idx = sorted.findIndex((t) => t.txid === tx.txid);
  if (idx <= 0) return 0.1;

  const gap = tx.timestamp - sorted[idx - 1].timestamp;

  // Very close timing = high risk
  if (gap < 60) return 0.95; // < 1 minute
  if (gap < 120) return 0.80; // < 2 minutes
  if (gap < 300) return 0.60; // < 5 minutes
  if (gap < 600) return 0.40; // < 10 minutes
  if (gap < 1800) return 0.25; // < 30 minutes
  if (gap < 3600) return 0.15; // < 1 hour
  
  return 0.1; // > 1 hour
}

function detectAnomalies(
  tx: TxRecord,
  allTransactions: TxRecord[]
): number {
  let anomalyScore = 0;

  // Calculate statistics
  const amounts = allTransactions.map((t) => Math.abs(t.amount));
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // Z-score for amount
  const zScore = Math.abs((Math.abs(tx.amount) - mean) / stdDev);
  if (zScore > 3) anomalyScore += 40; // Very unusual amount
  else if (zScore > 2) anomalyScore += 20;

  // Round number detection (often indicates manual/exchange)
  const roundness = Math.abs(tx.amount) % 1e8;
  if (roundness === 0) anomalyScore += 15; // Exact ZEC amount

  // Frequency analysis (rapid succession)
  const recentTxs = allTransactions.filter(
    (t) => Math.abs(t.timestamp - tx.timestamp) < 3600
  );
  if (recentTxs.length > 5) anomalyScore += 25;

  return Math.min(100, anomalyScore);
}

// ============================================================================
// PORTFOLIO PRIVACY METRICS
// ============================================================================

export function calculatePrivacyMetrics(
  transactions: TxRecord[]
): PrivacyMetrics {
  if (transactions.length === 0) {
    return {
      overallScore: 100,
      transactionCount: 0,
      dustTransactions: 0,
      highRiskTransactions: 0,
      memoUsage: 0,
      timingRiskAverage: 0,
      recommendations: ["No transactions to analyze"],
    };
  }

  const scores = transactions.map((tx) => tx.risk?.privacyScore ?? 70);
  const overallScore = Math.round(
    scores.reduce((a, b) => a + b, 0) / scores.length
  );

  const dustTransactions = transactions.filter(
    (tx) => tx.risk?.dust
  ).length;

  const highRiskTransactions = transactions.filter(
    (tx) => (tx.risk?.privacyScore ?? 100) < PRIVACY_THRESHOLDS.POOR
  ).length;

  const withMemo = transactions.filter((tx) => tx.memo).length;
  const memoUsage = Math.round((withMemo / transactions.length) * 100);

  const timingRisks = transactions
    .map((tx) => tx.risk?.timingLinkability ?? 0)
    .filter((r) => r > 0);
  const timingRiskAverage = timingRisks.length > 0
    ? timingRisks.reduce((a, b) => a + b, 0) / timingRisks.length
    : 0;

  const recommendations = generateRecommendations({
    overallScore,
    dustTransactions,
    highRiskTransactions,
    memoUsage,
    timingRiskAverage,
  });

  return {
    overallScore,
    transactionCount: transactions.length,
    dustTransactions,
    highRiskTransactions,
    memoUsage,
    timingRiskAverage,
    recommendations,
  };
}

function generateRecommendations(metrics: {
  overallScore: number;
  dustTransactions: number;
  highRiskTransactions: number;
  memoUsage: number;
  timingRiskAverage: number;
}): string[] {
  const recs: string[] = [];

  if (metrics.overallScore < PRIVACY_THRESHOLDS.GOOD) {
    recs.push("Overall privacy score is low. Review high-risk transactions.");
  }

  if (metrics.dustTransactions > 5) {
    recs.push(`${metrics.dustTransactions} dust transactions detected. Consider consolidating.`);
  }

  if (metrics.highRiskTransactions > 0) {
    recs.push(`${metrics.highRiskTransactions} high-risk transactions need attention.`);
  }

  if (metrics.memoUsage > 50) {
    recs.push("High memo usage detected. Avoid PII in memos.");
  }

  if (metrics.timingRiskAverage > 0.6) {
    recs.push("Transaction timing patterns are linkable. Add random delays.");
  }

  if (recs.length === 0) {
    recs.push("Privacy practices look excellent! Keep it up.");
  }

  return recs;
}

// ============================================================================
// VIEWING KEY HEALTH ANALYSIS
// ============================================================================

export function analyzeKeyHealth(ufvk: string): KeyHealth {
  const keyId = deriveKeyId(ufvk);
  const entropyScore = estimateEntropy(ufvk);
  const pastejackSuspected = detectPasteJack(ufvk);
  const patternRisk = getPatternRisk(entropyScore, ufvk);
  const warnings = generateKeyWarnings(entropyScore, pastejackSuspected, ufvk);
  const strength = getKeyStrength(entropyScore, warnings.length);

  return {
    keyId,
    entropyScore,
    pastejackSuspected,
    patternRisk,
    warnings,
    strength,
  };
}

function deriveKeyId(ufvk: string): string {
  let hash = 0;
  for (let i = 0; i < ufvk.length; i++) {
    hash = (hash * 33 + ufvk.charCodeAt(i)) >>> 0;
  }
  return `key_${hash.toString(16)}`;
}

function estimateEntropy(s: string): number {
  const uniqueChars = new Set(s.split("")).size;
  const diversity = uniqueChars / Math.min(128, s.length);
  
  // Check for character class diversity
  const hasLower = /[a-z]/.test(s);
  const hasUpper = /[A-Z]/.test(s);
  const hasDigit = /[0-9]/.test(s);
  const hasSpecial = /[^a-zA-Z0-9]/.test(s);
  
  const classBonus = [hasLower, hasUpper, hasDigit, hasSpecial]
    .filter(Boolean).length * 0.05;

  const lengthBonus = Math.min(0.2, s.length / 500);

  return Math.max(0.1, Math.min(1.0, diversity + classBonus + lengthBonus));
}

function detectPasteJack(ufvk: string): boolean {
  // Check for non-printable characters
  const hasNonPrintable = /[^\x20-\x7E]/.test(ufvk);
  
  // Check for unusually short length
  const looksClipped = ufvk.length < 80;
  
  // Check for suspicious whitespace
  const hasWeirdWhitespace = /\s{3,}/.test(ufvk);

  return hasNonPrintable || looksClipped || hasWeirdWhitespace;
}

function getPatternRisk(
  entropyScore: number,
  ufvk: string
): "low" | "medium" | "high" {
  if (entropyScore < 0.5) return "high";
  if (entropyScore < 0.75) return "medium";
  
  // Additional pattern checks
  const hasRepeats = /(.{3,})\1{2,}/.test(ufvk);
  const hasSequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(ufvk);
  
  if (hasRepeats || hasSequential) return "medium";
  
  return "low";
}

function generateKeyWarnings(
  entropyScore: number,
  pastejackSuspected: boolean,
  ufvk: string
): string[] {
  const warnings: string[] = [];

  if (pastejackSuspected) {
    warnings.push("⚠️ Key may be paste-jacked or corrupted");
  }

  if (entropyScore < 0.5) {
    warnings.push("⚠️ Very weak entropy detected");
  } else if (entropyScore < 0.7) {
    warnings.push("⚠️ Low entropy detected");
  }

  const commonPatterns = /password|test|sample|demo|1234|abcd|qwerty/i;
  if (commonPatterns.test(ufvk)) {
    warnings.push("⚠️ Key contains common weak patterns");
  }

  if (ufvk.length < 100) {
    warnings.push("⚠️ Key appears truncated");
  }

  return warnings;
}

function getKeyStrength(
  entropyScore: number,
  warningCount: number
): "weak" | "moderate" | "strong" | "excellent" {
  if (warningCount >= 3 || entropyScore < 0.5) return "weak";
  if (warningCount >= 2 || entropyScore < 0.7) return "moderate";
  if (entropyScore < 0.85) return "strong";
  return "excellent";
}

// ============================================================================
// ZK-FIREWALL CHECKS
// ============================================================================

export function checkTransactionFirewall(
  txData: Partial<TxRecord>
): FirewallCheck {
  const risks = {
    memoLength: false,
    amountPattern: false,
    timingRisk: false,
    poolSelection: false,
  };

  let riskCount = 0;

  // Check memo length
  if (txData.memo && txData.memo.length > CONSTANTS.SAFE_MEMO_LENGTH) {
    risks.memoLength = true;
    riskCount++;
  }

  // Check amount pattern
  if (txData.amount) {
    const roundness = Math.abs(txData.amount) % 1e8;
    if (roundness === 0 || txData.amount === 1e8 || txData.amount === 5e8) {
      risks.amountPattern = true;
      riskCount++;
    }
  }

  // Pool selection
  if (txData.pool === "transparent") {
    risks.poolSelection = true;
    riskCount++;
  }

  const overallRisk = riskCount >= 3 ? "high" : riskCount >= 2 ? "medium" : "low";

  const recommendations: string[] = [];
  if (risks.memoLength) recommendations.push("Shorten memo to < 140 chars");
  if (risks.amountPattern) recommendations.push("Use non-round amounts");
  if (risks.poolSelection) recommendations.push("Use Orchard for maximum privacy");
  if (risks.timingRisk) recommendations.push("Add random delay before sending");

  return { txData, risks, overallRisk, recommendations };
}

// ============================================================================
// ANTI-PHISHING CHECKS
// ============================================================================

export function checkAntiPhishing(
  ufvk: string,
  context?: { wasPasted: boolean }
): AntiPhishingCheck {
  const keyPasted = context?.wasPasted ?? false;
  const malwareIndicators: string[] = [];
  const warnings: string[] = [];

  // Check for malware indicators
  if (/malware|trojan|infected/i.test(ufvk)) {
    malwareIndicators.push("Suspicious keywords in key");
  }

  const health = analyzeKeyHealth(ufvk);
  if (health.pastejackSuspected) {
    malwareIndicators.push("Paste-jack detected");
    warnings.push("This key may have been tampered with");
  }

  if (health.entropyScore < 0.6) {
    malwareIndicators.push("Weak entropy (possible malware generation)");
    warnings.push("Key strength is weak");
  }

  const compromisedPatterns = /^(uview1|utest1|usample)/i.test(ufvk);
  if (compromisedPatterns) {
    warnings.push("Key uses known test/sample patterns");
  }

  const trustScore = Math.max(
    0,
    100 - malwareIndicators.length * 30 - (compromisedPatterns ? 20 : 0)
  );

  return {
    keyPasted,
    malwareIndicators,
    compromisedPatterns,
    trustScore,
    warnings,
  };
}