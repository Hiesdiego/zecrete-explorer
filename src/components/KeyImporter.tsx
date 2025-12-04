// src/components/KeyImporter.tsx
"use client";
import React, { useState } from "react";
import { useViewingKeys } from "@/hooks/useViewingKeys";

const DEMO_UFVK = "ufvkdemokey1";

export default function KeyImporter() {
  const { keys, addKey } = useViewingKeys();
  const [ufvk, setUfvk] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg(null);
    if (!ufvk || !password) return setMsg("UFVK and password required");
    setLoading(true);
    try {
      await addKey(ufvk.trim(), password.trim(), name.trim() || undefined);
      setMsg("Imported and encrypted locally.");
      setUfvk(""); setName(""); setPassword("");
    } catch (err:any) {
      setMsg("Import failed: " + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass p-6 rounded-xl">
      <h3 className="text-lg font-bold">Import Viewing Key</h3>
      <form onSubmit={submit} className="space-y-3">
        <textarea
          value={ufvk}
          onChange={e=>setUfvk(e.target.value)}
          rows={3}
          placeholder={`Paste UFVK here — demo: ${DEMO_UFVK}`}
          className="w-full p-3 rounded bg-black/20"
        />
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name (optional)" className="w-full p-2 rounded bg-black/10" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Encrypt with password" className="w-full p-2 rounded bg-black/10" />
        <div className="flex gap-2">
          <button disabled={loading} className="h-10 px-4 bg-zecrete-neon text-black rounded font-bold">{loading ? "Importing…" : "Import & Encrypt"}</button>
        </div>
      </form>
      {msg && <div className="text-sm text-gray-300 mt-2">{msg}</div>}
    </div>
  );
}
