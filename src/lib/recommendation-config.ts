/**
 * Bobot skor kecocokan "Sistem Pakar" — **satu-satunya tempat bobot ditulis**.
 *
 * Kenapa dipindahkan ke sini: bobot sebelumnya tertulis di dalam kode
 * (`@/lib/recommendation`) sebagai angka permanen yang seolah-olah hasil
 * penelitian, padahal tidak ada bukti di baliknya. Sekarang bobotnya
 * dikumpulkan di satu berkas, diberi alasan, dan diberi status yang jujur:
 * **masih dugaan** sampai diuji dengan data ulasan nyata.
 *
 * Aturan pakai:
 * 1. Bobot di sini hanya memakai kondisi yang **diisi pengunjung** (tipe air,
 *    kondisi air, cuaca, jenis pemancingan, musim, provinsi). Tidak ada angka
 *    katalog yang dihitung, karena satu-satunya angka komunitas di situs ini
 *    berasal dari tabel ulasan.
 * 2. Jangan mengubah bobot tanpa menjalankan evaluasi hit-rate@3
 *    (`npm run eval:rekomendasi`) dan menuliskan hasilnya di pesan commit.
 * 3. Total bobot harus tepat 100 supaya persentase kecocokan tetap 0–100.
 */
import type { UserPreferences } from "@/lib/recommendation";

export type MatchWeightKey = "waterBody" | "water" | "weather" | "fishingType" | "season" | "province";

export type MatchWeights = Record<MatchWeightKey, number>;

/**
 * Bobot **sementara** (versi 1, 14 Oktober 2026).
 *
 * Ini hipotesis editorial, bukan hasil pengukuran: belum ada cukup ulasan nyata
 * untuk membuktikannya. Perubahan dari bobot lama yang juga tidak pernah diuji:
 *
 * - `waterBody` (tipe air: kolam/sungai/danau) **ditambahkan** dengan bobot
 *   terbesar, karena situs ini sendiri menyatakan karakter air berbeda
 *   antarkolam — jadi jenis perairannya lebih menentukan daripada wilayah.
 * - `province` **diturunkan** dari 16 → 5: provinsi hanya proksi administratif,
 *   sedangkan pemancing memilih kolam, bukan provinsi.
 * - `water`, `weather`, `fishingType`, dan `season` disesuaikan agar totalnya
 *   tetap 100.
 */
export const MATCH_WEIGHTS: MatchWeights = {
  waterBody: 25,
  water: 20,
  weather: 20,
  fishingType: 20,
  season: 10,
  province: 5,
};

/**
 * Bobot lama (sebelum 14 Oktober 2026) yang dipakai tanpa bukti apa pun.
 * Disimpan hanya untuk pembanding saat evaluasi — bukan untuk dipakai lagi.
 */
export const MATCH_WEIGHTS_LAMA: Omit<MatchWeights, "waterBody"> = {
  water: 30,
  weather: 22,
  fishingType: 22,
  province: 16,
  season: 10,
};

/** Versi bobot, dipakai di laporan evaluasi dan dashboard. */
export const MATCH_WEIGHTS_VERSION = "sementara-1 (2026-10-14)";

/**
 * Rincian bobot untuk ditampilkan di antarmuka: label Indonesia + alasan.
 * Ditampilkan apa adanya kepada pengunjung supaya bobot tidak lagi "ditulis
 * permanen tanpa bukti".
 */
export const MATCH_WEIGHT_ENTRIES: { key: MatchWeightKey; label: string; bobot: number; alasan: string }[] = [
  { key: "waterBody", label: "Tipe air", bobot: MATCH_WEIGHTS.waterBody, alasan: "Kolam, sungai, dan danau punya karakter berbeda; satu provinsi bisa punya banyak kolam yang tidak sama." },
  { key: "water", label: "Kondisi air", bobot: MATCH_WEIGHTS.water, alasan: "Warna dan kejernihan air yang kamu lihat langsung memengaruhi pilihan aroma." },
  { key: "weather", label: "Cuaca", bobot: MATCH_WEIGHTS.weather, alasan: "Cuaca mengubah suhu dan keaktifan ikan saat sesi berjalan." },
  { key: "fishingType", label: "Jenis pemancingan", bobot: MATCH_WEIGHTS.fishingType, alasan: "Tekanan kolam saat harian, lomba, dan galatama berbeda." },
  { key: "season", label: "Musim", bobot: MATCH_WEIGHTS.season, alasan: "Peralihan musim mengubah kebiasaan makan ikan, tapi lebih lambat daripada kondisi harian." },
  { key: "province", label: "Provinsi", bobot: MATCH_WEIGHTS.province, alasan: "Bobot kecil: provinsi hanya proksi. Karakter air tiap kolam tetap perlu diamati sendiri." },
];

/** Total bobot yang harus selalu sama dengan 100. */
export const MATCH_WEIGHTS_TOTAL = Object.values(MATCH_WEIGHTS).reduce((sum, bobot) => sum + bobot, 0);

/** Apakah bobot yang ada sekarang masih seimbang (jumlahnya 100)? */
export const MATCH_WEIGHTS_BALANCED = MATCH_WEIGHTS_TOTAL === 100;

/** Kalimat jujur untuk pengunjung: dari mana skor ini datang dan seberapa kuat buktinya. */
export const MATCH_WEIGHTS_NOTE =
  "Bobot ini masih dugaan awal, belum diuji data. Kami evaluasi dengan hit-rate@3 (apakah resep yang berhasil masuk 3 teratas) begitu ulasan cukup, lalu menyesuaikannya.";

/**
 * Aturan evaluasi yang disepakati: sebuah ulasan dianggap **berhasil** kalau
 * rating ≥ 4 **dan** hasil tangkapannya tinggi; yang dihitung adalah berapa kali
 * resep tersebut muncul di 3 teratas untuk kondisi yang dilaporkan.
 */
export const TUNING_TARGET = {
  /** Hit-rate dihitung sampai 3 teratas (hit-rate@3). */
  topK: 3,
  /** Rating minimum sebuah ulasan agar dianggap berhasil. */
  minRating: 4,
  /** "Tangkapan tinggi" = minimal sekian ekor dalam satu sesi (lihat catatan di bawah). */
  highCatchMin: 5,
  /** Di bawah jumlah ini, hasil tuning tidak layak dipercaya — laporan hanya menampilkan keadaan. */
  minStrictReviewsForTuning: 30,
  /** Sampel minimum untuk hit-rate@3 versi longgar (hanya rating). */
  minRatingOnlyReviewsForTuning: 60,
} as const;

/**
 * Catatan soal "tangkapan tinggi": kolom hasil tangkapan bersifat opsional di
 * formulir ulasan, jadi hanya sebagian ulasan memilikinya. Laporan evaluasi
 * selalu menampilkan dua angka — hit-rate@3 versi ketat (rating ≥ 4 **dan**
 * tangkapan ≥ 5 ekor) dan versi longgar (rating ≥ 4 saja) — supaya tidak ada
 * angka yang dilebih-lebihkan.
 */
export const HIGH_CATCH_NOTE =
  "Hasil tangkapan bersifat opsional di formulir, jadi ulasan tanpa angka tangkapan tidak bisa dinilai \"tangkapan tinggi\".";

/**
 * Kandidat bobot untuk diuji. Tuning memilih kandidat dengan hit-rate@3
 * terbaik, tetapi **hanya** kalau jumlah ulasan yang memenuhi syarat sudah
 * melewati `TUNING_TARGET.minStrictReviewsForTuning`; di bawah itu hasilnya
 * hanya dilaporkan, tidak dipakai untuk mengubah kode.
 */
export const CANDIDATE_WEIGHT_SETS: { nama: string; weights: MatchWeights }[] = [
  { nama: "sekarang (sementara-1)", weights: MATCH_WEIGHTS },
  { nama: "tipe air dominan", weights: { waterBody: 35, water: 20, weather: 15, fishingType: 15, season: 10, province: 5 } },
  { nama: "tanpa provinsi", weights: { waterBody: 25, water: 20, weather: 20, fishingType: 20, season: 15, province: 0 } },
  { nama: "kondisi air dominan", weights: { waterBody: 20, water: 30, weather: 20, fishingType: 20, season: 10, province: 0 } },
  { nama: "seimbang", weights: { waterBody: 20, water: 20, weather: 20, fishingType: 20, season: 10, province: 10 } },
  { nama: "seperti bobot lama + tipe air", weights: { waterBody: 10, water: 30, weather: 22, fishingType: 22, season: 10, province: 6 } },
];

/** Semua kunci bobot, dipakai untuk memeriksa isian pengunjung. */
export const MATCH_WEIGHT_KEYS: MatchWeightKey[] = ["waterBody", "water", "weather", "fishingType", "season", "province"];

/** Nama field preferensi pengunjung untuk setiap kunci bobot (sama, hanya beda tipe). */
export type WeightedPreferenceKey = Extract<keyof UserPreferences, MatchWeightKey>;
