import { Pool } from "pg";
import { normalizeDatabaseUrl } from "@/lib/database-url";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

type Database = NodePgDatabase<typeof schema>;

/**
 * Nama variabel lingkungan yang menyediakan connection string, atau `null`
 * kalau belum ada. Produksi (Vercel) memakai `DATABASE_URL` berisi
 * connection string Supabase Transaction pooler (port 6543).
 */
export function databaseEnvName(): "DATABASE_URL" | null {
  return process.env.DATABASE_URL ? "DATABASE_URL" : null;
}

export function isDatabaseConfigured(): boolean {
  return databaseEnvName() !== null;
}

function createDatabase(): Database {
  // `normalizeDatabaseUrl` menambahkan sslmode=require untuk host non-lokal
  // (Supabase pooler, Neon) yang mewajibkan TLS, plus uselibpqcompat=true
  // untuk host Supabase agar sertifikat CA internalnya diterima `pg`.
  const { value: connectionString } = normalizeDatabaseUrl(process.env.DATABASE_URL);
  const pool = new Pool({
    connectionString: connectionString || undefined,
    // Batasi jejak koneksi SETIAP instance serverless. Produksi memakai
    // pooler Supabase mode transaksi (port 6543), yang mengembalikan
    // koneksi server setiap transaksi selesai — jauh lebih tahan untuk
    // serverless daripada mode session (port 5432, 15 slot klien yang
    // pernah jenuh dengan EMAXCONNSESSION). Batas per instance ini tetap
    // dipasang sebagai pengaman: instance serverless bisa bermunculan
    // banyak dan berumur pendek, sementara bawaan pg.Pool adalah maks 10
    // koneksi per instance. Antrean koneksi menyerah setelah 10 detik
    // (galatnya lalu ditangani coba-ulang di `bacaDenganCobaUlang`).
    max: 3,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  });
  return drizzle({ client: pool, schema });
}

let database: Database | undefined;
export const db = new Proxy({} as Database, {
  get(_target, property) {
    database ??= createDatabase();
    const value = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
