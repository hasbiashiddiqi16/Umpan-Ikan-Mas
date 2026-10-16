import { getDatabase } from "@netlify/database";
import { normalizeDatabaseUrl } from "@/lib/database-url";
import { drizzle } from "drizzle-orm/netlify-db";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { PgAsyncDatabase } from "drizzle-orm/pg-core/async";
import * as schema from "./schema";

type Database = PgAsyncDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Nama variabel lingkungan yang menyediakan connection string, atau `null`
 * kalau belum ada. Paket Netlify hanya membaca `NETLIFY_DB_URL`, yang disuntikkan
 * otomatis saat aplikasi berjalan di Netlify. Di host lain (mis. Vercel) cukup
 * setel `DATABASE_URL` dengan connection string basis data yang sama.
 */
export function databaseEnvName(): "DATABASE_URL" | "NETLIFY_DB_URL" | null {
  if (process.env.DATABASE_URL) return "DATABASE_URL";
  if (process.env.NETLIFY_DB_URL) return "NETLIFY_DB_URL";
  return null;
}

export function isDatabaseConfigured(): boolean {
  return databaseEnvName() !== null;
}

function createDatabase(): Database {
  // `normalizeDatabaseUrl` menambahkan sslmode=require untuk host non-lokal
  // (Supabase pooler, Neon, Netlify Database) yang mewajibkan TLS.
  const { value: connectionString } = normalizeDatabaseUrl(process.env.DATABASE_URL || process.env.NETLIFY_DB_URL);
  // Tanpa override, paket Netlify memakai NETLIFY_DB_URL dari lingkungan.
  const connection = getDatabase(connectionString ? { connectionString } : {});
  if (connection.driver === "server") {
    // Batasi jejak koneksi SETIAP instance serverless. Produksi memakai
    // pooler Supabase mode transaksi (port 6543), yang mengembalikan
    // koneksi server setiap transaksi selesai — jauh lebih tahan untuk
    // serverless daripada mode session (port 5432, 15 slot klien yang
    // pernah jenuh dengan EMAXCONNSESSION). Batas per instance ini
    // tetap dipasang sebagai pengaman: instance serverless bisa
    // bermunculan banyak dan berumur pendek, sementara bawaan pg.Pool
    // adalah maks 10 koneksi per instance. pg-pool membaca nilai ini
    // saat membuat/melepas klien, jadi pengaturan setelah pool
    // terbentuk tetap berlaku: maks 3 koneksi per instance, koneksi
    // menganggur dilepas setelah 5 detik, dan antrean koneksi menyerah
    // setelah 10 detik (galatnya lalu ditangani coba-ulang di
    // `bacaDenganCobaUlang`).
    connection.pool.options.max = 3;
    connection.pool.options.idleTimeoutMillis = 5_000;
    connection.pool.options.connectionTimeoutMillis = 10_000;
  }
  return drizzle({ client: connection, schema });
}

let database: Database | undefined;
export const db = new Proxy({} as Database, {
  get(_target, property) {
    database ??= createDatabase();
    const value = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
