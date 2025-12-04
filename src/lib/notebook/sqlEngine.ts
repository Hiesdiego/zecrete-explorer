// src/lib/notebook/sqlEngine.ts
/**
 * SQL Notebook Engine
 * - Uses sql.js to create an in-memory DB
 * - Loads transactions into `transactions` table
 * - Exposes runQuery(sql) -> { columns, rows, timeMs }
 *
 * Security:
 * - Does not persist the DB
 * - Avoids exposing raw UFVKs or secrets in results
 */

import initSqlJs, { SqlJsStatic, Database } from "sql.js";
import type { TxRecord } from "@/lib/types";

let SQL: SqlJsStatic | null = null;

export async function initSql() {
  if (!SQL) SQL = await initSqlJs({ locateFile: (file) => `/node_modules/sql.js/dist/${file}` });
  return SQL;
}

export async function createDbFromTxs(txs: TxRecord[]) {
  const sql = await initSql();
  const db = new sql.Database();

  // Create table
  db.run(`CREATE TABLE transactions (
    txid TEXT PRIMARY KEY,
    height INTEGER,
    timestamp INTEGER,
    pool TEXT,
    amount INTEGER,
    memo TEXT,
    direction TEXT,
    keyId TEXT,
    address TEXT,
    confirmations INTEGER
  );`);

  const insert = db.prepare(`INSERT INTO transactions (txid,height,timestamp,pool,amount,memo,direction,keyId,address,confirmations) VALUES (?,?,?,?,?,?,?,?,?,?);`);
  try {
    db.run("BEGIN TRANSACTION;");
    for (const t of txs) {
      insert.run([
        t.txid,
        t.height,
        t.timestamp,
        t.pool,
        t.amount,
        t.memo ?? null,
        t.direction,
        t.keyId,
        t.address ?? null,
        t.confirmations ?? 0,
      ]);
    }
    db.run("COMMIT;");
  } finally {
    insert.free();
  }

  return db;
}

export function runQuery(db: Database, sql: string): { columns: string[]; rows: any[][]; rowCount: number; timeMs: number } {
  const t0 = performance.now();
  let res;
  try {
    res = db.exec(sql);
  } catch (err) {
    throw err;
  }
  const t1 = performance.now();
  if (!res || res.length === 0) return { columns: [], rows: [], rowCount: 0, timeMs: Math.round(t1 - t0) };

  const columns = res[0].columns;
  const rows = res[0].values;
  return { columns, rows, rowCount: rows.length, timeMs: Math.round(t1 - t0) };
}
