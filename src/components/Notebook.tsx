"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  createNote,
  listNotes,
  loadNote,
  saveNote,
  deleteNote,
  exportEncryptedNote,
  importEncryptedNote,
  restoreNoteVersion,
  addAttachmentToNote,
  removeAttachmentFromNote,
  Note,
} from "@/lib/notebook/manager";
import { useSession } from "@/context/SessionProvider";
import { motion } from "framer-motion";
import { eventBus } from "@/lib/eventBus";
import {
  FileText,
  Plus,
  Search,
  Tag,
  Pin,
  Trash2,
  Download,
  Upload,
  Copy,
  Paperclip,
  Clock,
  Save,
  Edit,
  Eye,
  ChevronRight,
  MoreVertical,
  Check,
  X,
  Star,
  Filter,
  BookOpen,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";

// small helper to safely render markdown (same as before)
function simpleMarkdownToHtml(md: string) {
  if (!md) return "";
  let s = md
    .replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\n/g, "<br/>");
  return s;
}

export default function Notebook({ txs }: { txs: any[] }) {
  const session = useSession();
  const { activeKey, deriveNotebookPassphrase, refresh } = session ?? {};
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const autosaveTimer = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [isTagging, setIsTagging] = useState(false);

  // new: mobile state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false); // when true, note editor opens fullscreen on mobile

  // derive passphrase if available
  async function getPass() {
    try {
      if (activeKey?.ufvk && deriveNotebookPassphrase) {
        return await deriveNotebookPassphrase(activeKey.ufvk);
      }
    } catch (e) {
      /* ignore */
    }
    return undefined;
  }

  async function loadAll() {
    setLoading(true);
    try {
      const pass = await getPass();
      const ls = await listNotes(pass);
      setNotes(ls);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const off = eventBus.on("note:refresh", () => loadAll());
    window.addEventListener("zecrete:notes:refresh", loadAll as any);

    // detect mobile via matchMedia
    const mm = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(max-width: 640px)") : null;
    const setFromMM = () => setIsMobile(Boolean(mm ? mm.matches : false));
    setFromMM();
    if (mm && mm.addEventListener) mm.addEventListener("change", setFromMM);

    return () => {
      off();
      window.removeEventListener("zecrete:notes:refresh", loadAll as any);
      if (mm && mm.removeEventListener) mm.removeEventListener("change", setFromMM);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey?.ufvk]);

  async function newNoteFor(txid?: string) {
    const pass = await getPass();
    const note = await createNote({
      txid,
      title: txid ? `Transaction Analysis ${String(txid).slice(0, 8)}` : "Untitled Note",
      body: "",
    }, pass);
    setNotes((n) => [note, ...n]);
    setActive(note);
    setEditing(true);
    if (isMobile) setMobileOpen(true);
  }

  // Save active note
  async function saveActive(draft?: Note) {
    if (!active && !draft) return;
    setLoading(true);
    try {
      const n = draft ?? active!;
      const pass = await getPass();
      await saveNote(n, pass);
      const fresh = await listNotes(pass);
      setNotes(fresh);
      const reloaded = await loadNote(n.id, pass);
      setActive(reloaded);
      setEditing(false);
      setSavedIndicator(`Saved ${new Date().toLocaleTimeString()}`);
      eventBus.emit("note:saved", { id: n.id });
      setTimeout(() => setSavedIndicator(null), 2500);
    } catch (e) {
      console.error("saveActive failed", e);
      eventBus.emit("toast", { type: "error", text: "Failed to save note" });
    } finally {
      setLoading(false);
    }
  }

  function scheduleAutosave(n: Note) {
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      saveActive(n);
    }, 1200) as unknown as number;
  }

  async function removeNote(id: string) {
    if (!window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;
    await deleteNote(id);
    setNotes(await listNotes(await getPass()));
    setActive(null);
    setMobileOpen(false);
    eventBus.emit("note:deleted", { id });
  }

  // quick search/filter
  const visibleNotes = notes.filter((n) => {
    if (selectedTag && !(n.tags || []).includes(selectedTag)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (n.title || "").toLowerCase().includes(q) ||
      (n.body || "").toLowerCase().includes(q) ||
      (n.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  // derive all tags
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || []))).filter(Boolean);

  // file handling
  function fileToBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const result = fr.result as string;
        res(result.split(",")[1] ?? result);
      };
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  async function handleAttachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !active) return;
    const pass = await getPass();
    const file = files[0];
    const dataBase64 = await fileToBase64(file);
    const updated = await addAttachmentToNote(active.id, file.name, dataBase64, pass);
    if (updated) {
      setActive(updated);
      setNotes(await listNotes(pass));
      eventBus.emit("toast", { type: "success", text: `Attached ${file.name}` });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDownloadAttachment(attName: string) {
    if (!active) return;
    const att = (active.attachments || []).find((a) => a.name === attName);
    if (!att) return alert("Attachment not found");
    try {
      const bin = atob(att.dataBase64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes.buffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("download attachment failed", e);
      eventBus.emit("toast", { type: "error", text: "Failed to download attachment" });
    }
  }

  async function handleExportActiveEncrypted() {
    if (!active) {
      eventBus.emit("toast", { type: "warning", text: "Select a note first" });
      return;
    }
    const pass = await getPass();
    try {
      const snap = await exportEncryptedNote(active.id, pass);

      if (!snap) {
        throw new Error("No snapshot produced");
      }

      // Normalize to string
      const snapText = typeof snap === "string" ? snap : JSON.stringify(snap);

      // Try clipboard first (common expected UX), fall back to download if blocked
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(snapText);
          eventBus.emit("toast", { type: "success", text: "Encrypted snapshot copied to clipboard" });
          return;
        } else {
          throw new Error("Clipboard API not available");
        }
      } catch (clipErr) {
        // Fallback: download as file
        try {
          const blob = new Blob([snapText], { type: "application/json;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const safeTitle = (active.title || "zecrete_note").replace(/[^a-z0-9_\-\.]/gi, "_");
          a.download = `${safeTitle}_${active.id.slice(0, 8)}.zecrete.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          eventBus.emit("toast", { type: "success", text: "Encrypted snapshot downloaded" });
          return;
        } catch (dlErr) {
          console.error("download fallback failed", dlErr);
          eventBus.emit("toast", { type: "error", text: "Failed to export snapshot" });
        }
      }
    } catch (e) {
      console.error("export failed", e);
      eventBus.emit("toast", { type: "error", text: "Export failed" });
    }
  }

  async function handleImportSnapshot() {
    const input = prompt("Paste encrypted snapshot (or plaintext exported snapshot):");
    if (!input) return;
    const pass = await getPass();
    try {
      const imported = await importEncryptedNote(input, pass);
      setNotes(await listNotes(pass));
      setActive(imported);
      setEditing(false);
      if (isMobile) setMobileOpen(true);
      eventBus.emit("toast", { type: "success", text: "Note imported successfully" });
    } catch (e: any) {
      console.error("import failed", e);
      eventBus.emit("toast", { type: "error", text: `Import failed: ${e?.message ?? String(e)}` });
    }
  }

  async function handleRestoreVersion(idx: number) {
    if (!active) return;
    const pass = await getPass();
    try {
      const restored = await restoreNoteVersion(active.id, idx, pass);
      if (restored) {
        setActive(restored);
        setNotes(await listNotes(pass));
        eventBus.emit("toast", { type: "success", text: "Version restored" });
      } else {
        eventBus.emit("toast", { type: "error", text: "Failed to restore version" });
      }
    } catch (e) {
      console.error("restore failed", e);
      eventBus.emit("toast", { type: "error", text: "Restore failed" });
    }
  }

  const addTag = () => {
    if (!active || !tagInput.trim()) return;
    const updated = {
      ...active,
      tags: Array.from(new Set([...(active.tags || []), tagInput.trim()])),
    };
    setActive(updated);
    saveActive(updated);
    setTagInput("");
    setIsTagging(false);
  };

  const removeTag = (tagToRemove: string) => {
    if (!active) return;
    const updated = {
      ...active,
      tags: (active.tags || []).filter((t) => t !== tagToRemove),
    };
    setActive(updated);
    saveActive(updated);
  };

  // render editor as a function so we can reuse it in desktop and mobile overlay
  function EditorContent() {
    if (!active) return null;
    return (
      <div className="space-y-6">
        {/* Editor Header (compact for mobile) */}
        <div className="glass rounded-xl p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <input
              value={active.title}
              onChange={(e) => {
                const updated = { ...active, title: e.target.value };
                setActive(updated);
                scheduleAutosave(updated);
              }}
              className="w-full text-lg sm:text-2xl font-bold bg-transparent border-none focus:outline-none"
              placeholder="Note Title"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActive({ ...active, pinned: !active.pinned });
                  saveActive({ ...active, pinned: !active.pinned });
                }}
                className={`p-2 rounded-lg transition-colors ${active.pinned ? 'bg-[var(--accent)] text-black' : 'hover:bg-[var(--surface)]'}`}
                title={active.pinned ? "Unpin note" : "Pin note"}
              >
                <Pin className="w-4 h-4" />
              </button>

              <button
                onClick={() => removeNote(active.id)}
                className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {(active.tags || []).map((tag) => (
                <div key={tag} className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent-dark)]/10">
                  <span className="text-sm text-[var(--accent)]">{tag}</span>
                  <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {isTagging ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    className="px-3 py-1.5 rounded-full bg-[var(--surface)] text-sm focus:outline-none"
                    placeholder="Add tag..."
                    autoFocus
                  />
                  <button onClick={addTag} className="p-1 rounded-full bg-green-500/20 text-green-400"><Check className="w-4 h-4" /></button>
                  <button onClick={() => { setIsTagging(false); setTagInput(""); }} className="p-1 rounded-full bg-red-500/20 text-red-400"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <button onClick={() => setIsTagging(true)} className="px-3 py-1.5 rounded-full border border-dashed border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors text-sm">+ Add Tag</button>
              )}
            </div>
          </div>

          {/* Editor Actions */}
          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => setEditing(!editing)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${editing ? 'bg-[var(--accent)] text-black' : 'hover:bg-[var(--surface)]'}`}>
              {editing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}<span className="text-sm">{editing ? 'Save' : 'Edit'}</span>
            </button>

            <button onClick={() => setPreview(!preview)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${preview ? 'bg-[var(--accent)] text-black' : 'hover:bg-[var(--surface)]'}`}>
              <Eye className="w-4 h-4" /> <span className="text-sm">Preview</span>
            </button>

            <input ref={fileInputRef} type="file" className="hidden" onChange={handleAttachFile} />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors"><Paperclip className="w-4 h-4" /><span className="text-sm">Attach</span></button>

            <div className="ml-auto flex items-center gap-2">
              <button onClick={handleExportActiveEncrypted} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors"><Download className="w-4 h-4" /><span className="text-sm">Export</span></button>
              <button onClick={handleImportSnapshot} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors"><Upload className="w-4 h-4" /><span className="text-sm">Import</span></button>
            </div>
          </div>
        </div>

        {/* Editor/Preview Area */}
        <div>
          {editing ? (
            <textarea
              value={active.body}
              onChange={(e) => {
                const updated = { ...active, body: e.target.value };
                setActive(updated);
                scheduleAutosave(updated);
              }}
              className="w-full h-[56vh] sm:h-96 p-3 sm:p-4 rounded-xl glass border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
              placeholder="Start writing your note... (Markdown supported)"
            />
          ) : (
            <div className="space-y-6">
              {preview ? (
                <div className="p-4 sm:p-6 rounded-xl glass border border-[var(--border)] prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(active.body || "") }} />
              ) : (
                <div className="p-4 sm:p-6 rounded-xl glass border border-[var(--border)] whitespace-pre-wrap font-mono">{active.body || (<div className="text-center py-6 text-[var(--text-secondary)]"><FileText className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No content yet. Click Edit to start writing.</p></div>)}</div>
              )}

              {/* Attachments */}
              {(active.attachments || []).length > 0 && (
                <div className="glass rounded-xl p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><Paperclip className="w-4 h-4 text-[var(--accent)]" />Attachments ({active.attachments?.length})</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {(active.attachments || []).map((att) => (
                      <div key={att.name} className="p-3 rounded-lg bg-[var(--surface)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-transparent flex items-center justify-center"><Paperclip className="w-4 h-4 text-[var(--accent)]" /></div>
                          <div>
                            <div className="font-medium text-sm truncate max-w-[200px]">{att.name}</div>
                            <div className="text-xs text-[var(--text-secondary)]">{new Date(att.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDownloadAttachment(att.name)} className="p-2 rounded-lg hover:bg-[var(--accent)]/10 transition-colors" title="Download"><Download className="w-4 h-4" /></button>
                          <button onClick={async () => {
                            const pass = await getPass();
                            const updated = await removeAttachmentFromNote(active.id, att.name, pass);
                            if (updated) { setActive(updated); setNotes(await listNotes(pass)); eventBus.emit("toast", { type: "success", text: "Attachment removed" }); }
                          }} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors" title="Remove"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Version History */}
              {(active.versions || []).length > 0 && (
                <div className="glass rounded-xl p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-[var(--accent)]" />Version History</h4>
                  <div className="space-y-3">
                    {(active.versions || []).map((v, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[var(--surface)]">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">{v.title}</div>
                            <div className="text-xs text-[var(--text-secondary)]">{new Date(v.updatedAt).toLocaleString()}</div>
                          </div>
                          <button onClick={() => handleRestoreVersion(i)} className="px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors text-sm">Restore</button>
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] line-clamp-2">{v.body?.substring(0, 200)}...</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2 sm:px-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center"><BookOpen className="w-5 h-5 text-black" /></div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Explorer Notebook</h2>
            <p className="text-sm text-[var(--text-secondary)]">Private notes with end-to-end encryption</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedIndicator && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-sm"><Check className="w-3 h-3" />{savedIndicator}</div>
          )}

          <div className="flex items-center gap-2">
            <button onClick={() => newNoteFor()} className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-[var(--surface)] transition-all duration-300"><Plus className="w-4 h-4" /><span className="text-sm font-medium hidden sm:inline">New Note</span></button>
            <button onClick={() => newNoteFor(txs?.[0]?.txid)} className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-[var(--surface)] transition-all duration-300"><MessageSquare className="w-4 h-4" /><span className="text-sm font-medium hidden sm:inline">For Latest TX</span></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar - Note List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-4 h-4 text-[var(--text-secondary)]" /></div>
            <input className="w-full pl-10 pr-4 py-2 rounded-xl glass border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" placeholder="Search notes..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          {/* Tags Filter */}
          <div className="glass rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium flex items-center gap-2"><Tag className="w-4 h-4 text-[var(--accent)]" />Tags</h3>
              <button onClick={() => setSelectedTag(null)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]">Clear</button>
            </div>

            <div className="space-y-2">
              <button onClick={() => setSelectedTag(null)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${selectedTag === null ? 'bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent-dark)]/10 text-[var(--accent)] border border-[var(--accent)]/20' : 'hover:bg-[var(--surface)]'}`}>
                <span className="text-sm">All Notes</span>
                <span className="text-xs text-[var(--text-secondary)]">{notes.length}</span>
              </button>

              {allTags.map((tag) => (
                <button key={tag} onClick={() => setSelectedTag(tag)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${selectedTag === tag ? 'bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent-dark)]/10 text-[var(--accent)] border border-[var(--accent)]/20' : 'hover:bg-[var(--surface)]'}`}>
                  <span className="text-sm truncate">{tag}</span>
                  <span className="text-xs text-[var(--text-secondary)]">{notes.filter(n => (n.tags || []).includes(tag)).length}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note List */}
          <div className="glass rounded-xl p-3 max-h-[50vh] overflow-y-auto">
            <div className="space-y-2">
              {visibleNotes.length === 0 ? (
                <div className="text-center py-6 text-[var(--text-secondary)]"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No notes found</p></div>
              ) : (
                visibleNotes.map((note) => (
                  <motion.div key={note.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={async () => { setActive(note); setEditing(false); if (isMobile) setMobileOpen(true); if (!isMobile) { const pass = await getPass(); const re = await loadNote(note.id, pass); setActive(re); } }} className={`p-3 rounded-xl cursor-pointer transition-all duration-300 ${active?.id === note.id ? 'glass border border-[var(--accent)] shadow-lg' : 'hover:bg-[var(--surface)] border border-transparent'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium truncate flex-1">{note.title}</h4>
                      {note.pinned && (<Pin className="w-3 h-3 text-[var(--accent)] flex-shrink-0 ml-2" />)}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mb-1">{new Date(note.updatedAt).toLocaleDateString()}</div>
                    <div className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-2">{note.body?.substring(0, 100)}...</div>
                    <div className="flex flex-wrap gap-1">{(note.tags || []).slice(0, 3).map(tag => (<span key={tag} className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">{tag}</span>))}{(note.tags || []).length > 3 && (<span className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--surface)] text-[var(--text-secondary)]">+{(note.tags || []).length - 3}</span>)}</div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Editor Area (desktop) */}
        <div className="lg:col-span-3 hidden lg:block">
          {!active ? (
            <div className="glass rounded-xl p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-[var(--text-secondary)] opacity-30" />
              <h3 className="text-xl font-semibold mb-2">Select or Create a Note</h3>
              <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">Start documenting your findings, insights, and analysis of Zcash transactions. All notes are encrypted locally.</p>
              <button onClick={() => newNoteFor()} className="gold-gradient px-6 py-3 rounded-xl font-semibold text-black inline-flex items-center gap-2"><Plus className="w-4 h-4" />Create First Note</button>
            </div>
          ) : (
            <div className="space-y-6">
              <EditorContent />
            </div>
          )}
        </div>
      </div>

      {/* Mobile full-screen overlay for editor */}
      {isMobile && mobileOpen && active && (
        <div className="fixed inset-0 z-50 p-4 pt-24 sm:pt-6 bg-[var(--bg)]/95 backdrop-blur-md">
          <div className="max-w-[1000px] mx-auto h-[calc(100vh-4rem)] overflow-auto">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => { setMobileOpen(false); setActive(null); }} className="p-2 rounded-md hover:bg-[var(--surface)]"><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="text-lg font-semibold">{active.title || 'Note'}</h3>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setEditing(!editing)} className={`p-2 rounded-md ${editing ? 'bg-[var(--accent)] text-black' : 'hover:bg-[var(--surface)]'}`}>{editing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}</button>
                <button onClick={() => setPreview(!preview)} className={`p-2 rounded-md ${preview ? 'bg-[var(--accent)] text-black' : 'hover:bg-[var(--surface)]'}`}><Eye className="w-4 h-4" /></button>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-md hover:bg-red-500/10 text-red-400"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="space-y-4">
              <EditorContent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
