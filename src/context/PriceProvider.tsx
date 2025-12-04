"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { eventBus } from "@/lib/eventBus";

type PriceData = {
  usd: number;
  change24h: number;
};

type PriceContextValue = {
  price: PriceData;
  status: "online" | "offline";
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const PriceContext = createContext<PriceContextValue | null>(null);

export function PriceProvider({ children }: { children: React.ReactNode }) {
  const [price, setPrice] = useState<PriceData>({ usd: 0, change24h: 0 });
  const [status, setStatus] = useState<"online" | "offline">(
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fetch real price */
  async function fetchPrice() {
    if (status === "offline") {
      setError("Offline — using cached price");
      eventBus.emit("toast", {
        type: "error",
        text: "Offline — using cached ZEC price",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?" +
          "ids=zcash&vs_currencies=usd&include_24hr_change=true",
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error("Fetch failed");

      const json = await res.json();
      const p = {
        usd: json.zcash.usd,
        change24h: json.zcash.usd_24h_change,
      };

      setPrice(p);
      localStorage.setItem("zec:last", JSON.stringify(p));

      eventBus.emit("toast", {
        type: "success",
        text: "ZEC price updated",
      });
    } catch (e) {
      setError("Failed to fetch live price");

      const cached = localStorage.getItem("zec:last");
      if (cached) {
        setPrice(JSON.parse(cached));
      }

      eventBus.emit("toast", {
        type: "error",
        text: "Failed to fetch ZEC price (using cached)",
      });
    } finally {
      setLoading(false);
    }
  }

  const refresh = async () => {
    await fetchPrice();
  };

  /** Online/offline listeners */
  useEffect(() => {
    const handleOnline = () => {
      setStatus("online");
      fetchPrice();
    };
    const handleOffline = () => {
      setStatus("offline");
      setError("Offline — using cached price");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /** Load cached on first render */
  useEffect(() => {
    const cached = localStorage.getItem("zec:last");
    if (cached) setPrice(JSON.parse(cached));
    fetchPrice();
  }, []);

  /** Auto-refresh every 60 seconds */
  useEffect(() => {
    const t = setInterval(fetchPrice, 60000);
    return () => clearInterval(t);
  }, [status]);

  return (
    <PriceContext.Provider value={{ price, status, loading, error, refresh }}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrice() {
  const ctx = useContext(PriceContext);
  if (!ctx) throw new Error("usePrice must be inside <PriceProvider>");
  return ctx;
}
