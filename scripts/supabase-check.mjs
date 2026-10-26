#!/usr/bin/env node
/**
 * Memeriksa apakah Supabase bisa dihubungi dengan konfigurasi yang ada.
 *
 *   npm run supabase:check
 *
 * Yang diperiksa:
 * 1. NEXT_PUBLIC_SUPABASE_URL dan kunci publiknya terbaca (dari lingkungan,
 *    .env.local, atau .env).
 * 2. Endpoint REST Supabase menjawab dan menerima kunci tersebut.
 * 3. Bila DATABASE_URL tersedia, koneksi PostgreSQL (Drizzle) juga diuji.
 *
 * Aman dijalankan: skrip ini hanya membaca, tidak mengubah data apa pun.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

const fromFile = { ...readEnvFile(join(process.cwd(), ".env")), ...readEnvFile(join(process.cwd(), ".env.local")) };
const read = (key) => process.env[key] || fromFile[key];

const url = read("NEXT_PUBLIC_SUPABASE_URL");
const key = read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || read("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const databaseUrl = read("DATABASE_URL");

let failed = false;
const line = (label, ok, detail) => {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed = true;
};

console.log("Memeriksa konfigurasi Supabase…\n");

if (!url || !key) {
  line("Variabel lingkungan Supabase", false, "NEXT_PUBLIC_SUPABASE_URL dan/atau kunci publik belum ada di lingkungan, .env.local, atau .env");
  console.log("\nSalin contohnya dari .env.example, isi nilainya, lalu jalankan lagi.");
  process.exit(1);
}
line("Variabel lingkungan Supabase", true, url);
line("Kunci publik", true, key.startsWith("sb_publishable_") ? "format publishable" : key.startsWith("eyJ") ? "format JWT (anon lama)" : "format tidak dikenal");

try {
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.text();
  if (response.ok) {
    line("Endpoint REST Supabase", true, `HTTP ${response.status}`);
  } else if (response.status === 401 || response.status === 403) {
    line("Kunci publik diterima", false, `HTTP ${response.status} — kunci ditolak. Periksa nilainya di Supabase → Project Settings → API Keys.`);
  } else {
    line("Endpoint REST Supabase", false, `HTTP ${response.status} — ${body.slice(0, 120)}`);
  }
} catch (error) {
  line("Endpoint REST Supabase", false, `tidak dapat dihubungi (${error.message}). Periksa alamat proyek dan koneksi jaringan.`);
}

if (databaseUrl) {
  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    const result = await client.query("select count(*)::int as total from information_schema.tables where table_schema = 'public'");
    await client.end();
    line("Koneksi PostgreSQL (DATABASE_URL)", true, `${result.rows[0].total} tabel di skema public`);
    if (result.rows[0].total === 0) console.log("  Catatan: belum ada tabel. Jalankan `npm run db:migrate` dengan DATABASE_URL yang sama.");
  } catch (error) {
    // Galat koneksi pg sering datang sebagai AggregateError tanpa pesan; ambil
    // keterangan dari rantai cause agar penyebabnya tetap terbaca.
    const detail = String(
      error?.message || "" ||
      error?.code || "" ||
      error?.cause?.code || "" ||
      error?.cause?.message || "" ||
      error?.name || "",
    ).trim().split("\n")[0].slice(0, 140);
    line("Koneksi PostgreSQL (DATABASE_URL)", false, detail || "galat tidak dikenal");
  }
} else {
  console.log("• DATABASE_URL tidak disetel — lewati pemeriksaan PostgreSQL.");
}

console.log(`\n${failed ? "Ada yang perlu diperbaiki." : "Semua siap."}`);
process.exit(failed ? 1 : 0);
