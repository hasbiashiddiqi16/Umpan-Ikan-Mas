#!/usr/bin/env node
/**
 * Menerapkan migrasi di netlify/database/migrations ke basis data yang ditunjuk
 * DATABASE_URL (atau NETLIFY_DB_URL).
 *
 * Netlify menjalankan migrasi ini otomatis saat deploy. Host lain — misalnya
 * Vercel — tidak, jadi jalankan:
 *
 *   DATABASE_URL="postgres://..." npm run db:migrate
 *
 * Skrip ini aman dijalankan berulang: nama migrasi yang sudah diterapkan dicatat
 * di tabel cms_migrations, dan migrasi yang sudah ada di basis data (mis. sudah
 * dijalankan Netlify) dikenali lewat galat "already exists" tanpa menggagalkan proses.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const MIGRATIONS_DIR = join(process.cwd(), "netlify", "database", "migrations");
const TRACKING_TABLE = "cms_migrations";
/** Kode galat PostgreSQL untuk objek yang sudah ada (tabel, indeks, kolom, dsb.). */
const ALREADY_EXISTS = new Set(["42P07", "42710", "42701", "42P06", "42P16", "23505"]);

function readEnvFile(name) {
  if (!existsSync(name)) return {};
  const values = {};
  for (const line of readFileSync(name, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return values;
}

const fromFile = { ...readEnvFile(".env"), ...readEnvFile(".env.local") };
const rawConnectionString = process.env.DATABASE_URL || process.env.NETLIFY_DB_URL || fromFile.DATABASE_URL || fromFile.NETLIFY_DB_URL;

/**
 * Logika yang sama dengan src/lib/database-url.ts: basis data terkelola
 * (Supabase pooler, Neon, Netlify Database) mewajibkan TLS, sedangkan driver pg
 * tidak menyalakannya tanpa parameter `sslmode`.
 */
function normalizeConnectionString(value) {
  if (!value) return { value, added: false };
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return { value, added: false };
  }
  if (url.searchParams.get("sslmode") || url.searchParams.get("ssl")) return { value, added: false };
  if (["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"].includes(url.hostname.toLowerCase())) return { value, added: false };
  url.searchParams.set("sslmode", "require");
  return { value: url.toString(), added: true };
}

const normalized = normalizeConnectionString(rawConnectionString);
const connectionString = normalized.value;

if (!connectionString) {
  console.error("Connection string belum ada. Setel DATABASE_URL (atau NETLIFY_DB_URL) lalu jalankan lagi.");
  console.error("Contoh: DATABASE_URL=\"postgres://user:pass@host/db?sslmode=require\" npm run db:migrate");
  process.exit(1);
}
if (normalized.added) {
  console.log("Menambahkan sslmode=require ke connection string (host non-lokal).");
}
if (!existsSync(MIGRATIONS_DIR)) {
  console.error(`Folder migrasi tidak ditemukan: ${MIGRATIONS_DIR}`);
  process.exit(1);
}

const names = readdirSync(MIGRATIONS_DIR)
  .filter((name) => existsSync(join(MIGRATIONS_DIR, name, "migration.sql")))
  .sort();

if (names.length === 0) {
  console.log("Tidak ada berkas migrasi.");
  process.exit(0);
}

const client = new pg.Client({ connectionString });
await client.connect();
let failed = false;

try {
  await client.query(`create table if not exists ${TRACKING_TABLE} (name text primary key, applied_at timestamptz default now() not null)`);
  const { rows } = await client.query(`select name from ${TRACKING_TABLE}`);
  const applied = new Set(rows.map((row) => row.name));

  for (const name of names) {
    if (applied.has(name)) {
      console.log(`• ${name} — sudah pernah diterapkan, dilewati`);
      continue;
    }
    const statements = readFileSync(join(MIGRATIONS_DIR, name, "migration.sql"), "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);
    try {
      await client.query("begin");
      for (const statement of statements) {
        // Savepoint dipakai supaya "sudah ada" bisa diabaikan tanpa menggugurkan transaksi.
        await client.query("savepoint langkah");
        try {
          await client.query(statement);
          await client.query("release savepoint langkah");
        } catch (error) {
          await client.query("rollback to savepoint langkah");
          // Basis data yang sudah dimigrasi Netlify belum punya catatan kita.
          if (!ALREADY_EXISTS.has(error.code)) throw error;
        }
      }
      await client.query(`insert into ${TRACKING_TABLE} (name) values ($1) on conflict (name) do nothing`, [name]);
      await client.query("commit");
      console.log(`✓ ${name} — diterapkan`);
    } catch (error) {
      await client.query("rollback");
      console.error(`✗ ${name} — gagal: ${error.message}`);
      failed = true;
      break;
    }
  }
} finally {
  await client.end();
}

process.exit(failed ? 1 : 0);
