// public/workers/ultra-generator.worker.js
// Ultra generator worker - streams large mock datasets in chunks.
// Designed for Zecrete Explorer (HyperMock ultra mode).

// Minimal seeded RNG for determinism
let SEED = 1337;
function setSeed(s) { SEED = s >>> 0; }
function seeded() {
  SEED ^= SEED << 13;
  SEED ^= SEED >>> 17;
  SEED ^= SEED << 5;
  return (SEED >>> 0) / 0xFFFFFFFF;
}
function ri(min, max) { return Math.floor(seeded() * (max - min + 1)) + min; }
function r(min, max) { return min + (max - min) * seeded(); }
function randHash() { const hex = "abcdef0123456789"; let s=""; for(let i=0;i<64;i++) s+=hex[ri(0,hex.length-1)]; return s; }
function zAddr() { return "zs1" + randHash().slice(0,75); }

const MEMO_BANK = ["Salary","Refund","Payment","Donation","Subscription","Invoice","Tip","Coffee","Rent","Gemini deposit","Gemini withdrawal","Exchange settlement"];

function shapeRisk(value, memo, pool) {
  let score = 0;
  if (value < 0.0003) score += 30;
  if (memo && memo.length > 80) score += 20;
  if (value > 3 && pool === "orchard") score += 12;
  score += ri(1,15);
  return Math.min(95, score);
}

function pick(arr){ return arr[ri(0,arr.length-1)]; }

self.onmessage = async (e) => {
  const { count = 25000, batchSize = 20, seed = Date.now(), includeGemini=true } = e.data;
  setSeed(seed);
  const pools = ["sapling","orchard"];
  const baseHeight = 2_980_000;
  const now = Math.floor(Date.now()/1000);
  let cancelled = false;
  self.onmessage = (ev) => { if (ev.data === "cancel") cancelled = true; };

  for (let i=0;i<count;i+=batchSize) {
    if (cancelled) {
      self.postMessage({ type: "cancelled" });
      return;
    }
    const batch = [];
    const end = Math.min(i + batchSize, count);
    for (let j=i;j<end;j++){
      const pool = pick(pools);
      const isIncoming = seeded() > 0.45;
      const value = +(r(0.0001, 10.0)).toFixed(8);
      let from = null, to = null;
      if (isIncoming) { from = pick([zAddr(), zAddr(), "gemini:deposit"]) ; to = "You"; }
      else { from = "You"; to = pick([zAddr(), "gemini:withdrawal"]); }

      // gemini flow: occasionally tag as gemini with round amounts and quick timings
      const isGemini = includeGemini && seeded() > 0.995;
      const tags = [];
      if (isGemini) {
        tags.push("gemini");
      } else if (seeded() > 0.93) tags.push("suspected-link");
      const memo = seeded() > 0.7 ? pick(MEMO_BANK) + (seeded()>0.95 ? " #" + randHash().slice(0,6) : "") : null;
      const noteCount = ri(1,3);
      const notes = [];
      for (let n=0;n<noteCount;n++){
        notes.push({
          id: randHash().slice(0,32),
          value: +(value / noteCount * r(0.7,1.3)).toFixed(8),
          memo: seeded() > 0.77 ? (memo || "note") : null,
          isIncoming,
          pool
        });
      }
      const timestamp = now - (count - j) * 30 - Math.floor(Math.sin(j/100) * 600);
      const risk = shapeRisk(value, memo, pool);
      if (isGemini) {
        // amplify gemini pattern
        notes[0].memo = "Gemini settlement " + randHash().slice(0,6);
      }
      batch.push({
        txid: randHash(),
        height: baseHeight + j,
        timestamp,
        value,
        type: isIncoming ? "incoming" : "outgoing",
        fromAddr: from,
        toAddr: to,
        pool,
        riskScore: risk,
        tags,
        notes
      });
    }

    // post chunk
    self.postMessage({
      type: "chunk",
      progress: Math.round((end / count) * 100),
      batch
    });

    // small pause to avoid busy-looping
    await new Promise(r=>setTimeout(r, 40));
  }

  self.postMessage({ type: "done" });
};
