// src/lib/engine/zk-firewall.ts
/**
 * zk-Firewall Simulator
 *
 * Input: partial tx data (amount, memo, pool, estimated timing)
 * Output: FirewallCheck with boolean flags, overallRisk, and recommendations
 *
 * This module is intentionally conservative and explainable.
 */

import type { FirewallCheck, TxRecord } from "@/lib/types";
import { CONSTANTS } from "@/lib/types";

export function evaluateFirewall(txData: Partial<TxRecord>): FirewallCheck {
  const risks = {
    memoLength: false,
    amountPattern: false,
    timingRisk: false,
    poolSelection: false,
  };
  let riskCount = 0;

  // Memo length
  if (txData.memo && txData.memo.length > CONSTANTS.SAFE_MEMO_LENGTH) {
    risks.memoLength = true;
    riskCount++;
  }

  // Amount pattern: round ZEC values (exact zats)
  if (typeof txData.amount === "number") {
    const roundness = Math.abs(txData.amount) % CONSTANTS.ZATS_PER_ZEC;
    if (roundness === 0 || [1e8, 5e8, 10e8].includes(Math.abs(txData.amount))) {
      risks.amountPattern = true;
      riskCount++;
    }
  }

  // Pool selection
  if (txData.pool === "transparent") {
    risks.poolSelection = true;
    riskCount++;
  }

  // Timing risk: if provided and less than 120s
  if (txData.timestamp && Date.now() / 1000 - txData.timestamp < 120) {
    risks.timingRisk = true;
    riskCount++;
  }

  const overallRisk = riskCount >= 3 ? "high" : riskCount >= 2 ? "medium" : "low";

  const recommendations: string[] = [];
  if (risks.memoLength) recommendations.push("Shorten memo to < 140 chars to reduce linkability.");
  if (risks.amountPattern) recommendations.push("Avoid round amounts — use slightly varied outputs.");
  if (risks.poolSelection) recommendations.push("Prefer Orchard pool for maximum privacy.");
  if (risks.timingRisk) recommendations.push("Delay sending or mix timing to blend with background traffic.");

  return { txData, risks, overallRisk: overallRisk as any, recommendations };
}
