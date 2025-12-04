"use client";
import React, { useEffect, useState } from "react";

export default function PriceToast({ status }: { status: "success" | "error" | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status) {
      setVisible(true);
      const id = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(id);
    }
  }, [status]);

  if (!status || !visible) return null;

  return (
    <div
      className={`fixed bottom-24 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 ${
        status === "success" ? "bg-green-600" : "bg-red-600"
      }`}
    >
      {status === "success" ? "Price updated successfully!" : "Failed to refresh price"}
    </div>
  );
}
