/**
 * Shim D1 minimal di atas node:sqlite (bawaan Node 22) untuk tes lokal.
 * Hanya mendukung permukaan API yang dipakai worker: prepare/bind/first/run/all/batch.
 * Ini BUKAN D1 asli — perilaku FTS5/limit D1 tetap perlu diverifikasi di workerd/D1 nyata.
 */
import initSql from "../../../../migrations/0001_init.sql?raw";

type Param = string | number | null;

// Vite menghapus prefix "node:" pada import statis/dinamis, jadi ambil modul lewat
// process.getBuiltinModule (Node >= 22.3) agar tidak melewati resolver Vite.
const getBuiltin = (
  globalThis as unknown as {
    process: { getBuiltinModule(id: string): unknown };
  }
).process.getBuiltinModule;

export async function createTestDb(): Promise<D1Database> {
  const mod = getBuiltin("node:sqlite") as {
    DatabaseSync: new (path: string) => {
      exec(sql: string): void;
      prepare(sql: string): {
        get(...p: Param[]): unknown;
        all(...p: Param[]): unknown[];
        run(...p: Param[]): { changes: number | bigint };
      };
    };
  };
  const db = new mod.DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(initSql);

  const makeStmt = (sql: string, params: Param[] = []) => {
    const stmt = {
      bind: (...p: Param[]) => makeStmt(sql, p),
      first: async (col?: string) => {
        const row = db.prepare(sql).get(...params) as Record<string, unknown> | undefined;
        if (!row) return null;
        return col ? (row[col] ?? null) : row;
      },
      all: async () => ({
        results: db.prepare(sql).all(...params),
        success: true,
        meta: {},
      }),
      run: async () => {
        const r = db.prepare(sql).run(...params);
        return { results: [], success: true, meta: { changes: Number(r.changes) } };
      },
    };
    return stmt;
  };

  const shim = {
    prepare: (sql: string) => makeStmt(sql),
    batch: async (stmts: Array<{ run: () => Promise<unknown> }>) => {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
    /** Akses mentah untuk memanipulasi data di tes (mis. membuat sesi kedaluwarsa). */
    exec: (sql: string) => db.exec(sql),
  };
  return shim as unknown as D1Database;
}

export function rawExec(db: D1Database, sql: string): void {
  (db as unknown as { exec(sql: string): void }).exec(sql);
}
