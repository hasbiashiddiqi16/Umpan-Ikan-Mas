#!/usr/bin/env node
/**
 * Laporan evaluasi urutan rekomendasi (hit-rate@3) dari ulasan nyata.
 *
 *   ADMIN_PASSWORD="..." npm run eval:rekomendasi
 *   BASE_URL="http://127.0.0.1:3100" ADMIN_PASSWORD="..." npm run eval:rekomendasi
 *
 * Skrip ini hanya memanggil `GET /api/admin/recommendation-eval` di server yang
 * sedang berjalan, jadi perhitungannya memakai kode dan data yang sama persis
 * dengan yang dipakai dashboard serta halaman publik — tidak ada rumus
 * tandingan yang bisa berbeda hasil.
 *
 * Keluar dengan kode 1 kalau laporan gagal diambil, supaya bisa dipakai di CI.
 */
const BASE_URL = (process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const password = process.env.ADMIN_PASSWORD;

const persen = (nilai) => (nilai === null || nilai === undefined ? "belum ada data" : `${(nilai * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`);

function barisHitRate(label, hasil) {
  const keterangan = hasil.evaluable ? `${hasil.hits}/${hasil.evaluable} ulasan berhasil` : "belum ada ulasan yang bisa dinilai";
  return `  ${label.padEnd(34)} ${persen(hasil.hitRate).padStart(14)}  (${keterangan})`;
}

async function main() {
  if (!password) {
    console.error("ADMIN_PASSWORD belum diisi. Contoh: ADMIN_PASSWORD=\"...\" npm run eval:rekomendasi");
    process.exit(1);
  }

  const login = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!login.ok) {
    console.error(`Login admin gagal (${login.status}). Periksa ADMIN_PASSWORD dan BASE_URL.`);
    process.exit(1);
  }
  const cookie = (login.headers.getSetCookie?.() ?? []).map((item) => item.split(";")[0]).join("; ");

  const response = await fetch(`${BASE_URL}/api/admin/recommendation-eval`, { headers: { cookie } });
  if (!response.ok) {
    console.error(`Laporan tidak bisa diambil (${response.status}).`);
    process.exit(1);
  }
  const laporan = await response.json();

  console.log(`Evaluasi urutan rekomendasi — ${BASE_URL}`);
  console.log(`Bobot aktif: ${laporan.weightsVersion} · hit-rate@${laporan.topK}`);
  console.log("");
  console.log("Sampel ulasan nyata (disetujui, tanpa ulasan contoh):");
  console.log(`  total                     ${laporan.sample.approvedRealReviews}`);
  console.log(`  punya angka tangkapan     ${laporan.sample.withCatchCount}`);
  console.log(`  berhasil (rating ≥ ${laporan.minRating} dan tangkapan ≥ ${laporan.highCatchMin} ekor)  ${laporan.sample.strictSuccess}`);
  console.log(`  rating ≥ ${laporan.minRating} saja             ${laporan.sample.ratingSuccess}`);
  if (laporan.sample.skippedUnknownRecipe) console.log(`  dilewati (resep tidak ada di katalog)  ${laporan.sample.skippedUnknownRecipe}`);
  console.log("");
  console.log("Hit-rate@3 bobot sekarang:");
  console.log(barisHitRate("ketat (rating + tangkapan)", laporan.current.strict));
  console.log(barisHitRate("longgar (rating saja)", laporan.current.ratingOnly));
  console.log("");
  console.log("Kandidat bobot yang diuji:");
  for (const kandidat of laporan.candidates) {
    console.log(barisHitRate(kandidat.nama, kandidat.strict));
  }
  console.log("");
  console.log(`Saran: ${laporan.recommendation.dapatDituning ? "bisa dituning" : "belum bisa dituning"}`);
  console.log(`  ${laporan.recommendation.alasan}`);
  console.log("");
  console.log("Bobot yang dipakai sekarang:");
  for (const [nama, bobot] of Object.entries(laporan.weights)) console.log(`  ${nama.padEnd(12)} ${String(bobot).padStart(3)}`);
}

main().catch((error) => {
  console.error("Gagal menjalankan evaluasi:", error instanceof Error ? error.message : error);
  process.exit(1);
});
