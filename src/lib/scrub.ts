// src/lib/scrub.ts
export function obfuscateMemo(memo?: string) {
  if (!memo) return "";
  // Show a truncated safe version in UI unless ghost mode is enabled
  return memo.length > 140 ? memo.slice(0,140) + "…" : memo;
}
