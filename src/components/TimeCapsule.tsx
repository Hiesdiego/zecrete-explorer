// src/components/TimeCapsule.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { makeReplayFrames } from "@/lib/timecapsule";
import type { TxRecord } from "@/lib/types";

/**
 * TimeCapsule: slider-driven replay of transactions.
 * Props:
 *  - txs: TxRecord[]
 *  - onFrame(frameTxs, time) : called each frame (so parent can animate or render)
 */
export default function TimeCapsule({ txs, onFrame }: { txs: TxRecord[]; onFrame?: (txs: TxRecord[], time: number)=>void }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 0.5x
  const [idx, setIdx] = useState(0);
  const rafRef = useRef<number | null>(null);
  const framesRef = useRef<{ times: number[]; map: Map<number, TxRecord[]> } | null>(null);

  useEffect(() => {
    framesRef.current = makeReplayFrames(txs, 3600);
    setIdx(0);
  }, [txs]);

  function stop() {
    setPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  function step() {
    const frames = framesRef.current;
    if (!frames) return stop();
    const next = Math.min(frames.times.length - 1, idx + 1);
    setIdx(next);
    const t = frames.times[next];
    onFrame?.(frames.map.get(t) || [], t);
    if (next >= frames.times.length - 1) stop();
  }

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    function tick(now: number) {
      const dt = now - last;
      const interval = Math.max(80, 300 / speed);
      if (dt >= interval) {
        step();
        last = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, idx]);

  const total = framesRef.current?.times.length || 0;
  const curTime = framesRef.current?.times[idx] ?? 0;

  return (
    <div className="glass p-3 rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <strong>Time Capsule</strong>
          <div className="text-sm text-gray-400">Replay transactions over time</div>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={()=> setPlaying(p=>!p)} className="px-3 py-1 border rounded">{playing ? "Pause" : "Play"}</button>
          <select value={String(speed)} onChange={(e)=> setSpeed(Number(e.target.value))} className="p-1 rounded bg-black/5">
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
          </select>
        </div>
      </div>

      <div className="mt-3">
        <input type="range" min={0} max={Math.max(0, total-1)} value={idx} onChange={(e)=> { setIdx(Number(e.target.value)); const f = framesRef.current; if (f) { const t = f.times[Number(e.target.value)]; onFrame?.(f.map.get(t)||[], t); }}} className="w-full" />
        <div className="text-xs text-gray-400 mt-2">{total === 0 ? "No frames" : new Date((curTime||0)*1000).toLocaleString()}</div>
      </div>
    </div>
  );
}
