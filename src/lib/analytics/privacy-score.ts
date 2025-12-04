// src/lib/analytics/privacy-score.ts
/**
 * Privacy metrics aggregator
 * - Per-tx privacy score (delegates to risk.assessTransactionRisk)
 * - Portfolio summary and recommendations
 */

import type { TxRecord, PrivacyMetrics } from "@/lib/types";
import { calculatePrivacyMetrics } from "@/lib/risk";

/**
 * computePrivacySummary
 * - takes decrypted transactions and returns PrivacyMetrics
 * - delegates heavy lifting to calculatePrivacyMetrics in risk.ts
 */
export function computePrivacySummary(transactions: TxRecord[]): PrivacyMetrics {
  // risk.ts already provides calculatePrivacyMetrics which mirrors your spec.
  return calculatePrivacyMetrics(transactions);
}
