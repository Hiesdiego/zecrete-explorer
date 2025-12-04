'use client';
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { TxRecord } from "@/lib/types";
import { 
  Calendar,
  TrendingUp,
  BarChart3, 
  Filter,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp
} from "lucide-react";

type Props = {
  txs?: TxRecord[] | null;
  width?: number;
  height?: number;
  className?: string;
};

type Bucket = {
  key: string;
  label: string;
  count: number;
  isoDate?: string;
};

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 200;

function formatDateLabelForAggregation(key: string, agg: string) {
  if (agg === "month") return key;
  if (agg === "week") return key.replace(/^(\d+)-W/, "W");
  return key.slice(5);
}

function getDayKey(tsSeconds: number) {
  const d = new Date(tsSeconds * 1000);
  return d.toISOString().slice(0, 10);
}

function getWeekKey(tsSeconds: number) {
  const d = new Date(tsSeconds * 1000);
  const day = d.getUTCDay();
  const diffToMonday = ((day + 6) % 7);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday));
  return `W-${monday.toISOString().slice(0, 10)}`;
}

function getMonthKey(tsSeconds: number) {
  const d = new Date(tsSeconds * 1000);
  return d.toISOString().slice(0, 7);
}

function colorForIntensity(intensity: number) {
  const clamp = Math.max(0, Math.min(1, intensity));
  const r = Math.round(255 * (1 - clamp));
  const g = Math.round(139 + (255 - 139) * clamp);
  const b = Math.round(0 + (139 - 0) * clamp);
  const a = 0.3 + clamp * 0.7;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default function Heatmap({ txs, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, className }: Props) {
  const safeTxs: TxRecord[] = Array.isArray(txs) ? txs : [];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [aggregation, setAggregation] = useState<"day" | "week" | "month">("day");
  const [sortBy, setSortBy] = useState<"time" | "count">("time");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== "undefined" ? window.innerWidth <= 640 : false);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  // Responsive canvas sizing
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>(() => ({
    w: width,
    h: height,
  }));

  useEffect(() => {
    function onResizeCheck() {
      setIsMobile(window.innerWidth <= 640);
    }
    onResizeCheck();
    window.addEventListener("resize", onResizeCheck);
    return () => window.removeEventListener("resize", onResizeCheck);
  }, []);

  useEffect(() => {
    // ResizeObserver to track container width and set canvas accordingly
    const el = containerRef.current;
    if (!el) {
      setCanvasSize({ w: width, h: height });
      return;
    }

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect;
        const containerWidth = Math.max(280, Math.floor(rect.width));
        // Height strategy:
        // - on mobile, use a taller chart for readability
        // - on desktop, use provided height or a proportional height
        const computedHeight = isMobile
          ? Math.max(180, Math.floor(containerWidth * 0.35))
          : height ?? Math.max(180, Math.floor(containerWidth * 0.25));

        setCanvasSize({ w: containerWidth, h: computedHeight });
      }
    });

    ro.observe(el);

    // initial sizing
    const rect = el.getBoundingClientRect();
    const initialW = Math.max(280, Math.floor(rect.width || width));
    const initialH = isMobile ? Math.max(180, Math.floor(initialW * 0.35)) : height ?? Math.max(180, Math.floor(initialW * 0.25));
    setCanvasSize({ w: initialW, h: initialH });

    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef.current, isMobile, height, width]);

  // Build buckets
  const bucketsMap = useMemo(() => {
    const m = new Map<string, Bucket>();
    for (const t of safeTxs) {
      if (!t || typeof t.timestamp !== "number" || !Number.isFinite(t.timestamp) || t.timestamp <= 0) continue;
      let key: string;
      if (aggregation === "day") key = getDayKey(t.timestamp);
      else if (aggregation === "week") key = getWeekKey(t.timestamp);
      else key = getMonthKey(t.timestamp);

      const existing = m.get(key);
      if (existing) existing.count++;
      else {
        const isoDate = aggregation === "week" ? key.replace(/^W-/, "") : (aggregation === "month" ? key + "-01" : key);
        m.set(key, { key, label: "", count: 1, isoDate });
      }
    }
    return m;
  }, [safeTxs, aggregation]);

  // Convert map -> array & sort
  const bucketsChrono = useMemo(() => {
    const arr: Bucket[] = Array.from(bucketsMap.values()).map((b) => ({ ...b }));
    arr.sort((a, b) => {
      const aKey = a.isoDate ?? a.key;
      const bKey = b.isoDate ?? b.key;
      if (aKey < bKey) return -1;
      if (aKey > bKey) return 1;
      return 0;
    });
    arr.forEach((b) => {
      b.label = formatDateLabelForAggregation(b.key, aggregation);
    });
    return arr;
  }, [bucketsMap, aggregation]);

  // Final buckets array
  const buckets = useMemo(() => {
    if (sortBy === "time") return bucketsChrono;
    const arr = [...bucketsChrono].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const aKey = a.isoDate ?? a.key;
      const bKey = b.isoDate ?? b.key;
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });
    return arr;
  }, [bucketsChrono, sortBy]);

  // Hover info
  const hoveredBucket = hoverIndex != null && buckets[hoverIndex] ? buckets[hoverIndex] : null;
  const maxCount = useMemo(() => Math.max(...buckets.map((b) => b.count), 1), [buckets]);

  // Draw canvas whenever size or data changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const effectiveWidth = Math.max(200, canvasSize.w);
    const effectiveHeight = Math.max(120, canvasSize.h);

    canvas.width = Math.floor(effectiveWidth * dpr);
    canvas.height = Math.floor(effectiveHeight * dpr);
    canvas.style.width = `${effectiveWidth}px`;
    canvas.style.height = `${effectiveHeight}px`;

    // reset transform then scale
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, effectiveWidth, effectiveHeight);

    if (buckets.length === 0) {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface') || "#f3f4f6";
      ctx.fillRect(0, 0, effectiveWidth, effectiveHeight);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || "#9ca3af";
      ctx.font = "16px Inter, system-ui";
      ctx.textAlign = "center";
      ctx.fillText("No activity data available", effectiveWidth / 2, effectiveHeight / 2);
      return;
    }

    const padding = 20;
    const innerWidth = effectiveWidth - padding * 2;
    const innerHeight = effectiveHeight - padding * 2 - 30;
    const barWidth = innerWidth / buckets.length;
    const maxBarHeight = innerHeight * 0.8;

    // Draw bars
    buckets.forEach((bucket, i) => {
      const intensity = bucket.count / maxCount;
      const x = padding + i * barWidth;
      const barHeight = maxBarHeight * intensity;
      const y = effectiveHeight - padding - barHeight;

      // Bar
      ctx.fillStyle = colorForIntensity(intensity);
      ctx.fillRect(x, y, barWidth * 0.8, barHeight);

      // Bar highlight
      ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.2})`;
      ctx.fillRect(x, y, barWidth * 0.8, Math.min(barHeight, 4));

      // Labels (every 5th bar or last)
      if (i % 5 === 0 || i === buckets.length - 1) {
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || "#9ca3af";
        ctx.font = "10px Inter, system-ui";
        ctx.textAlign = "center";
        // rotate label slightly for narrow bars on small widths
        ctx.fillText(bucket.label, x + barWidth * 0.4, effectiveHeight - 10);
      }
    });

    // Grid line
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border') || "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, effectiveHeight - padding);
    ctx.lineTo(effectiveWidth - padding, effectiveHeight - padding);
    ctx.stroke();

    // Hover effect & tooltip
    if (hoverIndex !== null && hoveredBucket) {
      const x = padding + hoverIndex * barWidth;
      const barHeight = maxBarHeight * (hoveredBucket.count / maxCount);
      const y = effectiveHeight - padding - barHeight;

      // Highlight bar
      ctx.fillStyle = "rgba(255, 215, 0, 0.28)";
      ctx.fillRect(x - 2, y - 2, barWidth * 0.8 + 4, barHeight + 4);

      // Tooltip background
      const tooltipWidth = Math.min(220, effectiveWidth * 0.5);
      const tooltipHeight = 72;
      const tooltipX = Math.min(effectiveWidth - tooltipWidth - 10, Math.max(10, x - tooltipWidth / 2));
      const tooltipY = Math.max(10, y - tooltipHeight - 10);

      // Use roundRect if available, otherwise draw rounded rect manually
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8);
      } else {
        // fallback rounded rect
        const r = 8;
        ctx.moveTo(tooltipX + r, tooltipY);
        ctx.arcTo(tooltipX + tooltipWidth, tooltipY, tooltipX + tooltipWidth, tooltipY + tooltipHeight, r);
        ctx.arcTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight, tooltipX, tooltipY + tooltipHeight, r);
        ctx.arcTo(tooltipX, tooltipY + tooltipHeight, tooltipX, tooltipY, r);
        ctx.arcTo(tooltipX, tooltipY, tooltipX + tooltipWidth, tooltipY, r);
      }
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface-glass') || "rgba(255,255,255,0.9)";
      ctx.fill();
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent') || "#f59e0b";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Tooltip text
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text') || "#111827";
      ctx.font = "12px Inter, system-ui";
      ctx.textAlign = "left";
      ctx.fillText(hoveredBucket.key, tooltipX + 10, tooltipY + 20);

      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || "#6b7280";
      ctx.font = "11px Inter, system-ui";
      ctx.fillText(`Transactions: ${hoveredBucket.count}`, tooltipX + 10, tooltipY + 40);
      ctx.fillText(`Intensity: ${((hoveredBucket.count / maxCount) * 100).toFixed(1)}%`, tooltipX + 10, tooltipY + 60);
    }
  }, [buckets, hoverIndex, hoveredBucket, maxCount, canvasSize, dpr]);

  // Handle mouse move on canvas
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || buckets.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const padding = 20;
    const innerWidth = rect.width - padding * 2;
    const barWidth = innerWidth / buckets.length;

    const x = e.clientX - rect.left;
    const idx = Math.floor((x - padding) / barWidth);

    if (idx >= 0 && idx < buckets.length) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  }, [buckets]);

  // Disable fullscreen on mobile: hide the control and prevent toggling
  const toggleFullscreen = () => {
    if (isMobile) {
      // ignore or later you could show a toast: fullscreen disabled on mobile
      return;
    }
    setIsFullscreen((s) => !s);
  };

  // Reset filters
  const reset = () => {
    setAggregation("day");
    setSortBy("time");
  };

  return (
    <div ref={containerRef} className={`${className || ""} ${isFullscreen ? 'fixed inset-0 z-[9999] bg-[var(--bg)] p-6' : ''}`}>
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Activity Heatmap</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Visualize transaction patterns over time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Hide fullscreen control on mobile */}
            {!isMobile && (
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-[var(--surface)]"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span className="text-sm">{isFullscreen ? "Exit" : "Fullscreen"}</span>
              </button>
            )}

            <button
              onClick={reset}
              className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-[var(--surface)]"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">Reset</span>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="glass p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-[var(--accent)]" />
              <label className="text-sm font-medium">Aggregation Period</label>
            </div>
            <div className="flex gap-2">
              {(["day", "week", "month"] as const).map((agg) => (
                <button
                  key={agg}
                  onClick={() => setAggregation(agg)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    aggregation === agg
                      ? 'gold-gradient text-black'
                      : 'hover:bg-[var(--surface)]'
                  }`}
                >
                  {agg.charAt(0).toUpperCase() + agg.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="glass p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
              <label className="text-sm font-medium">Sort By</label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy("time")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  sortBy === "time"
                    ? 'gold-gradient text-black'
                    : 'hover:bg-[var(--surface)]'
                }`}
              >
                Time
              </button>
              <button
                onClick={() => setSortBy("count")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  sortBy === "count"
                    ? 'gold-gradient text-black'
                    : 'hover:bg-[var(--surface)]'
                }`}
              >
                Count
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIndex(null)}
            className="w-full rounded-xl cursor-pointer"
            style={{ height: isFullscreen ? '60vh' : `${canvasSize.h}px` }}
          />

          {/* Legend */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xs text-[var(--text-secondary)]">Intensity:</div>
              <div className="flex items-center gap-1">
                {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                  <div
                    key={v}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: colorForIntensity(v)
                    }}
                    title={`${Math.round(v * 100)}%`}
                    className="flex items-center justify-center text-[10px] font-bold"
                  >
                    {v === 0 ? "Low" : v === 1 ? "High" : ""}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-[var(--text-secondary)]">
              {buckets.length} periods • {safeTxs.length} total transactions
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="glass p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-transparent flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)]">Time Range</div>
                <div className="font-medium">
                  {buckets.length > 0 
                    ? `${buckets[0].key} — ${buckets[buckets.length - 1].key}`
                    : "No data"
                  }
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-transparent flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)] text-amber-600 dark:text-white">Peak Activity</div>
                <div className="font-medium">
                  {maxCount > 0 
                    ? `${maxCount} transactions on ${buckets.find(b => b.count === maxCount)?.key || "—"}`
                    : "No data"
                  }
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-transparent flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)]">Avg Per Period</div>
                <div className="font-medium">
                  {buckets.length > 0 
                    ? `${(safeTxs.length / buckets.length).toFixed(1)} transactions`
                    : "No data"
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
