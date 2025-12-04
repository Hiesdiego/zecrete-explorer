/**
 * Notebook Manager (hardened + extended)
 *
 * - Adds tags, pinned, attachments, versions and simple audit trail
 * - Saves previous note snapshot into `versions` on each save
 * - Keeps compatibility with encryptData/decryptData and legacy plain storage
 * - New utility exports:
 *    exportEncryptedNote(noteId, passwordForEncryption?) -> string (JSON snapshot)
 *    importEncryptedNote(snapshotString, passwordForEncryption?) -> created Note
 *    restoreNoteVersion(noteId, versionIndex, passwordForEncryption?)
 *
 * Note shape (extended):
 *  type Note = {
 *    id, keyId?, txid?, title, body, createdAt, updatedAt,
 *    tags?: string[],
 *    pinned?: boolean,
 *    attachments?: { name: string; dataBase64: string; createdAt: number }[],
 *    versions?: { updatedAt: number; title: string; body: string; tags?: string[] }[],
 *  }
 */

import { encryptData, decryptData } from "@/lib/vault";

const NOTE_PREFIX = "zecrete:notebook:v1:";
const INDEX_KEY = "zecrete:notebook:index";

export type Note = {
  id: string;
  keyId?: string;
  txid?: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  pinned?: boolean;
  attachments?: { name: string; dataBase64: string; createdAt: number }[];
  versions?: { updatedAt: number; title: string; body: string; tags?: string[] }[];
};

function id() {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function listNoteIds(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("listNoteIds: corrupted index, resetting", e);
    try { localStorage.removeItem(INDEX_KEY); } catch {}
    return [];
  }
}

export function saveNoteIndex(idx: string[]) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
  } catch (e) {
    console.warn("saveNoteIndex failed:", e);
  }
}

/**
 * Persist a vault-shaped or plain payload under `key`.
 * If passwordForEncryption provided, attempt to encrypt; on failure fall back to .plain record.
 */
async function storeVaultShape(key: string, plaintext: string, passwordForEncryption?: string) {
  // prefer encrypted storage
  if (passwordForEncryption) {
    try {
      const vault = await encryptData(plaintext, passwordForEncryption);
      if (typeof vault === "string") {
        localStorage.setItem(key, JSON.stringify({ ciphertext: vault, _legacyString: true }));
      } else {
        localStorage.setItem(key, JSON.stringify(vault));
      }
      return;
    } catch (e) {
      console.warn("storeVaultShape: encryptData failed, falling back to plain storage (non-secure).", e);
      // fallthrough to plaintext store
    }
  }

  // fallback to plain (tag it with .plain to help future migrations)
  try {
    localStorage.setItem(key, JSON.stringify({ plain: plaintext }));
  } catch (e) {
    console.error("Unable to persist note to localStorage:", e);
    throw e;
  }
}

/**
 * Read raw stored value (string). Returns null if not found.
 */
function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn("readRaw failed", e);
    return null;
  }
}

/**
 * saveNote
 * - Adds version entry when updating an existing note (previous snapshot)
 * - Keeps attachments inside note object so they get encrypted together
 */
export async function saveNote(note: Note, passwordForEncryption?: string) {
  const key = NOTE_PREFIX + note.id;
  const now = Date.now();
  note.updatedAt = now;

  // Ensure optional fields exist in a safe form
  note.tags = Array.isArray(note.tags) ? note.tags : (note.tags ? [String(note.tags)] : []);
  note.attachments = Array.isArray(note.attachments) ? note.attachments : note.attachments ? note.attachments : [];
  note.versions = Array.isArray(note.versions) ? note.versions : note.versions ? note.versions : [];

  // If existing note exists, capture previous version snapshot
  try {
    const raw = readRaw(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // If parsed looks like a vault, try decrypting with provided passphrase (best-effort)
        let existingNote: Note | null = null;
        if (parsed && (parsed.ciphertext || parsed.iv || parsed.salt || parsed.version)) {
          try {
            if (passwordForEncryption) {
              const plaintext = await decryptData(parsed, passwordForEncryption);
              existingNote = plaintext ? JSON.parse(plaintext) as Note : null;
            }
          } catch (e) {
            // ignore decrypt errors — fallback to attempting to parse ciphertext inner data
            if (typeof parsed.ciphertext === "string") {
              try {
                const maybeInner = JSON.parse(parsed.ciphertext);
                if (maybeInner && maybeInner.id) existingNote = maybeInner as Note;
              } catch {}
            }
          }
        } else if (parsed && parsed.plain) {
          try { existingNote = JSON.parse(parsed.plain) as Note; } catch {}
        } else if (parsed && parsed.id && parsed.title) {
          existingNote = parsed as Note;
        }

        if (existingNote) {
          // push version snapshot (we keep only title/body/tags + timestamp)
          const ver = {
            updatedAt: existingNote.updatedAt ?? existingNote.createdAt ?? Date.now(),
            title: existingNote.title,
            body: existingNote.body,
            tags: existingNote.tags,
          };
          note.versions = note.versions || [];
          note.versions.unshift(ver);
          // Keep only last N versions to avoid unbounded growth (configurable here)
          const MAX_VERSIONS = 50;
          if (note.versions.length > MAX_VERSIONS) note.versions = note.versions.slice(0, MAX_VERSIONS);
        }
      } catch (e) {
        // parsing existing raw failed — ignore
      }
    }
  } catch (e) {
    // non-fatal
  }

  // persist current note
  const plaintext = JSON.stringify(note);
  await storeVaultShape(key, plaintext, passwordForEncryption);

  // update index ordering: most-recent-first
  const idx = listNoteIds();
  const filtered = idx.filter(i => i !== note.id);
  filtered.unshift(note.id);
  saveNoteIndex(filtered);
}

/**
 * loadNote
 * - Defensive parsing of many stored shapes
 * - Returns Note | null (does not throw on decrypt errors)
 */
export async function loadNote(id_: string, passwordForEncryption?: string): Promise<Note | null> {
  const key = NOTE_PREFIX + id_;
  const raw = readRaw(key);
  if (!raw) return null;

  function tryParse(s: string) {
    try { return JSON.parse(s); } catch { return null; }
  }

  try {
    const parsed = tryParse(raw);
    if (!parsed) {
      // raw not JSON — treat as raw plaintext (old clients)
      try {
        const maybe = JSON.parse(raw);
        if (maybe && typeof maybe === "object") return maybe as Note;
      } catch (e) {
        console.warn("loadNote: unrecognized note format (non-JSON)", e);
        return null;
      }
    }

    // Case: vault-shaped object
    if (parsed && (parsed.ciphertext || parsed.iv || parsed.salt || parsed.version)) {
      // try decryptData first (expected)
      try {
        if (!passwordForEncryption) {
          // Without password, try weak fallbacks
          // - If parsed.ciphertext is JSON containing .plain or full note, use it
          if (typeof parsed.ciphertext === "string") {
            const inner = tryParse(parsed.ciphertext);
            if (inner) {
              if (inner.plain) {
                try { return JSON.parse(inner.plain) as Note; } catch {}
              } else if (inner.id && inner.title) {
                return inner as Note;
              }
            }
          }
          if (parsed.plain) {
            try { return JSON.parse(parsed.plain) as Note; } catch {}
          }
          return null;
        }
        const plaintext = await decryptData(parsed, passwordForEncryption);
        if (!plaintext) return null;
        try {
          return JSON.parse(plaintext) as Note;
        } catch (e) {
          console.warn("loadNote: decrypted payload is not JSON", e);
          return null;
        }
      } catch (e) {
        // decrypt failed — try recovery fallbacks
        console.warn("loadNote: decryptData failed, attempting fallbacks", e);
        if (typeof parsed.ciphertext === "string") {
          const inner = tryParse(parsed.ciphertext);
          if (inner) {
            if (inner.plain) {
              try { return JSON.parse(inner.plain) as Note; } catch {}
            } else if (inner.id && inner.title) {
              return inner as Note;
            }
          }
        }
        if (parsed.plain) {
          try { return JSON.parse(parsed.plain) as Note; } catch {}
        }
        return null;
      }
    }

    // Case: parsed has .plain
    if (parsed && parsed.plain) {
      try {
        return JSON.parse(parsed.plain) as Note;
      } catch (e) {
        console.warn("loadNote: failed to parse stored plain note", e);
        return null;
      }
    }

    // Case: parsed already looks like Note
    if (parsed && parsed.id && parsed.title) {
      return parsed as Note;
    }

    return null;
  } catch (err) {
    console.error("loadNote: unexpected error", err);
    return null;
  }
}

export async function createNote(
  params: { keyId?: string; txid?: string; title?: string; body?: string; tags?: string[] },
  passwordForEncryption?: string
): Promise<Note> {
  const now = Date.now();
  const n: Note = {
    id: id(),
    keyId: params.keyId,
    txid: params.txid,
    title: params.title || "Untitled",
    body: params.body || "",
    createdAt: now,
    updatedAt: now,
    tags: params.tags || [],
    pinned: false,
    attachments: [],
    versions: [],
  };
  await saveNote(n, passwordForEncryption);
  return n;
}

export async function deleteNote(id_: string) {
  try {
    localStorage.removeItem(NOTE_PREFIX + id_);
    // also remove index entry
    const idx = listNoteIds().filter((i) => i !== id_);
    saveNoteIndex(idx);
  } catch (e) {
    console.warn("deleteNote failed:", e);
  }
}

export async function listNotes(passwordForEncryption?: string): Promise<Note[]> {
  const ids = listNoteIds();
  const out: Note[] = [];
  for (const i of ids) {
    try {
      const n = await loadNote(i, passwordForEncryption);
      if (n) out.push(n);
    } catch (e) {
      console.warn(`listNotes: skipping note ${i} due to error`, e);
    }
  }
  // sort by updatedAt desc
  out.sort((a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0));
  return out;
}

/* ----------------------
   New utilities
   ---------------------- */

/**
 * Export encrypted snapshot (string) for sharing.
 * If passwordForEncryption supplied, final snapshot will be encrypted using that password.
 * The snapshot JSON includes note object (with attachments) in plaintext before final encryption.
 */
export async function exportEncryptedNote(noteId: string, passwordForEncryption?: string): Promise<string> {
  const n = await loadNote(noteId, passwordForEncryption);
  if (!n) throw new Error("Note not found or unable to decrypt for export");
  const snapshot = {
    meta: { exportedAt: Date.now(), noteId: n.id },
    note: n,
  };
  const plaintext = JSON.stringify(snapshot);
  if (!passwordForEncryption) return plaintext;
  try {
    const vault = await encryptData(plaintext, passwordForEncryption);
    return JSON.stringify(vault);
  } catch (e) {
    console.warn("exportEncryptedNote: encryption failed, returning plaintext snapshot", e);
    return plaintext;
  }
}

/**
 * Import exported snapshot (either plaintext JSON or encrypted vault object)
 * If snapshot is encrypted, passwordForEncryption must be supplied.
 * Returns created/merged note ID.
 */
export async function importEncryptedNote(snapshotString: string, passwordForEncryption?: string): Promise<Note> {
  // try to parse as JSON
  function tryParse(s: string) {
    try { return JSON.parse(s); } catch { return null; }
  }

  const parsed = tryParse(snapshotString);
  let snapshotObj: any | null = null;

  if (!parsed) {
    // not raw JSON — perhaps it's an encrypted vault object string (stringified)
    try {
      const vaultObj = JSON.parse(snapshotString);
      if (vaultObj && (vaultObj.ciphertext || vaultObj.iv || vaultObj.salt || vaultObj.version)) {
        if (!passwordForEncryption) throw new Error("Password required to import encrypted snapshot");
        const plaintext = await decryptData(vaultObj, passwordForEncryption);
        snapshotObj = tryParse(plaintext);
      }
    } catch (e) {
      throw new Error("Invalid snapshot format or wrong password");
    }
  } else {
    // if parsed is { meta, note } or a note itself
    if (parsed.meta && parsed.note) snapshotObj = parsed;
    else if (parsed.id && parsed.title) snapshotObj = { meta: { importedAt: Date.now() }, note: parsed };
    else snapshotObj = null;
  }

  if (!snapshotObj || !snapshotObj.note) throw new Error("Snapshot does not contain a note");

  const note: Note = snapshotObj.note;
  // ensure ID uniqueness: if a note with same id exists, create a new id to avoid collision
  const existingRaw = localStorage.getItem(NOTE_PREFIX + note.id);
  if (existingRaw) {
    note.id = id(); // new id
  }
  // save (encrypt with password if provided)
  await saveNote(note, passwordForEncryption);
  return note;
}

/**
 * Restore a previous note version (by index in versions array). The restored version becomes the current body/title.
 */
export async function restoreNoteVersion(noteId: string, versionIndex: number, passwordForEncryption?: string): Promise<Note | null> {
  const n = await loadNote(noteId, passwordForEncryption);
  if (!n) return null;
  if (!Array.isArray(n.versions) || versionIndex < 0 || versionIndex >= n.versions.length) return null;
  const v = n.versions[versionIndex];
  // push current state as a new version
  n.versions = n.versions || [];
  n.versions.unshift({ updatedAt: n.updatedAt ?? Date.now(), title: n.title, body: n.body, tags: n.tags });
  // apply restore
  n.title = v.title;
  n.body = v.body;
  n.tags = v.tags ?? n.tags;
  n.updatedAt = Date.now();
  await saveNote(n, passwordForEncryption);
  return n;
}

/**
 * Attach base64 file to a note (in-memory base64).
 */
export async function addAttachmentToNote(noteId: string, filename: string, dataBase64: string, passwordForEncryption?: string): Promise<Note | null> {
  const n = await loadNote(noteId, passwordForEncryption);
  if (!n) return null;
  n.attachments = n.attachments || [];
  n.attachments.push({ name: filename, dataBase64, createdAt: Date.now() });
  n.updatedAt = Date.now();
  await saveNote(n, passwordForEncryption);
  return n;
}

/**
 * Remove an attachment by name
 */
export async function removeAttachmentFromNote(noteId: string, filename: string, passwordForEncryption?: string): Promise<Note | null> {
  const n = await loadNote(noteId, passwordForEncryption);
  if (!n) return null;
  n.attachments = (n.attachments || []).filter(a => a.name !== filename);
  n.updatedAt = Date.now();
  await saveNote(n, passwordForEncryption);
  return n;
}
