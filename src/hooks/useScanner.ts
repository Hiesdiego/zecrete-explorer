// src/hooks/useScanner.ts
"use client";
import { useState, useRef } from "react";
import { mockScanner } from "@/lib/mock/scanner";

export function useScanner() {
  const [progress, setProgress] = useState<any>(null);
  const [partialTxs, setPartialTxs] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const controller = useRef<{ cancel: () => void } | null>(null);

  async function startScan(_ufvk: string, _opts: any) {
    setError(null);
    setResult(null);
    setPartialTxs([]);
    setIsScanning(true);

    // mock mode only (for now)
    const mock = mockScanner({ delay: 120, batchSize: 20 });
    controller.current = { cancel: mock.cancel };

    try {
      for await (const chunk of mock.scan()) {
        setPartialTxs(prev => [...chunk.partialTxs, ...prev]);
        setProgress({ percentage: chunk.percentage, status: chunk.status });
      }

      setResult({ transactions: partialTxs });
    } catch (e: any) {
      setError(e?.message ?? "Unknown scanner error");
    } finally {
      setIsScanning(false);
    }
  }

  function cancel() {
    controller.current?.cancel();
    setIsScanning(false);
    setProgress(null);
  }

  return {
    startScan,
    cancel,
    progress,
    partialTxs,
    result,
    error,
    isScanning,
  };
}
