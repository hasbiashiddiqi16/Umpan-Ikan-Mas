#!/usr/bin/env node
/**
 * Membersihkan sisa data contoh yang dulu tersinkronisasi ke basis data.
 *
 * Data contoh statis sudah dihapus dari kode, tetapi salinannya yang pernah
 * masuk basis data lewat sinkronisasi katalog lama masih ada:
 * - ulasan contoh di `cms_reviews` (kolom `seed_key` terisi), dan
 * - tiga resep contoh di `cms_recipes` (slug katalog lama di bawah).
 *
 * Tanpa flag `--terapkan` skrip ini hanya melaporkan jumlahnya (dry-run).
 * Dengan `--terapkan`:
 * - ulasan contoh dihapus permanen (itu karangan redaksi, bukan kiriman
 *   pengunjung), sedangkan ulasan pengunjung asli tidak disentuh sama
 *   sekali — termasuk yang menempel pada resep contoh;
 * - resep contoh diubah statusnya menjadi `archived` (hilang dari semua
 *   permukaan publik, tetapi tetap bisa dipulihkan atau dihapus permanen
 *   dari dashboard bila ternyata sudah disunting menjadi konten asli).
 *
 *   DATABASE_URL="postgres://..." npm run data:hapus-contoh
 *   DATABASE_URL="postgres://..." npm run data:hapus-contoh -- --terapkan
 */
import { existsSync, readFileSync } from "node:fs";
import pg from "pg";

/** Slug tiga resep contoh yang dulu dirilis sebagai katalog statis. */
const SLUG_RESEP_CONTOH = ["umpan-putih-kroto", "vanila-telur-bebek", "roti-tawar-kroto-lomba"];

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

if (!rawConnectionString) {
  console.error("Connection string belum ada. Setel DATABASE_URL (atau NETLIFY_DB_URL) lalu jalankan lagi.");
  process.exit(1);
}

// Host non-lokal wajib TLS; sertifikat Supabase memakai CA internal sehingga
// pg perlu uselibpqcompat=true (pola yang sama seperti scripts/migrate.mjs).
function normalizeConnectionString(value) {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return value;
  }
  const host = url.hostname.toLowerCase();
  const local = ["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"].includes(host);
  if (local || url.searchParams.has("sslmode") || url.searchParams.has("ssl")) return value;
  url.searchParams.set("sslmode", "require");
  if (/(^|\.)(supabase\.co|supabase\.com|supabase\.net)$/i.test(host)) url.searchParams.set("uselibpqcompat", "true");
  return url.toString();
}

const terapkan = process.argv.includes("--terapkan");
const pool = new pg.Pool({ connectionString: normalizeConnectionString(rawConnectionString), max: 1, connectionTimeoutMillis: 15000 });

try {
  const [ulasanContoh, resepContoh, ulasanAsliDiResepContoh] = await Promise.all([
    pool.query("SELECT count(*)::int AS total FROM cms_reviews WHERE seed_key IS NOT NULL"),
    pool.query("SELECT slug, status FROM cms_recipes WHERE slug = ANY($1) ORDER BY slug", [SLUG_RESEP_CONTOH]),
    pool.query("SELECT count(*)::int AS total FROM cms_reviews WHERE seed_key IS NULL AND recipe_slug = ANY($1)", [SLUG_RESEP_CONTOH]),
  ]);

  console.log(`Ulasan contoh (seed_key terisi): ${ulasanContoh.rows[0].total} baris`);
  if (resepContoh.rows.length) {
    for (const row of resepContoh.rows) console.log(`Resep contoh: ${row.slug} (status ${row.status})`);
  } else {
    console.log("Resep contoh: tidak ditemukan di basis data");
  }
  console.log(`Ulasan pengunjung asli pada resep contoh: ${ulasanAsliDiResepContoh.rows[0].total} baris (tidak akan disentuh)`);

  if (!terapkan) {
    console.log("\nMode laporan saja — belum ada yang diubah. Jalankan lagi dengan -- --terapkan untuk membersihkan.");
    process.exit(0);
  }

  const terhapus = await pool.query("DELETE FROM cms_reviews WHERE seed_key IS NOT NULL");
  const terarsip = await pool.query(
    "UPDATE cms_recipes SET status = 'archived', updated_at = now() WHERE slug = ANY($1) AND status <> 'archived'",
    [SLUG_RESEP_CONTOH],
  );
  console.log(`\nSelesai: ${terhapus.rowCount} ulasan contoh dihapus, ${terarsip.rowCount} resep contoh diarsipkan.`);
  console.log("Resep yang terarsip hilang dari situs publik dan dapat dipulihkan atau dihapus permanen dari dashboard Konten resep.");
} catch (error) {
  console.error("Pembersihan gagal:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await pool.end();
}
