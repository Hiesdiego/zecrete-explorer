// src/hooks/useScanEngine.tsx
"use client";
import { useCallback, useState } from "react";
import type { ScanParams, ScanProgress, ScanResult } from "@/lib/types";
import { startScanWorker } from "@/lib/workerClient";

export function useScanEngine() {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startScan = useCallback(async (ufvk: string, params: ScanParams) => {
    setIsScanning(true);
    setProgress(null);
    setResult(null);
    setError(null);
    try {
      const res = await startScanWorker(ufvk, params, (p) => setProgress(p));
      setResult(res);
    } catch (err:any) {
      setError(err?.message || String(err));
    } finally {
      setIsScanning(false);
    }
  }, []);

  return { progress, result, isScanning, error, startScan, setProgress, setResult };
}
