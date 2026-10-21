/**
 * Evaluasi urutan rekomendasi dengan **hit-rate@3**.
 *
 * Pertanyaan yang dijawab: kalau pengunjung melaporkan kondisi mancingnya dan
 * resep yang dipakainya **berhasil** (rating ≥ 4 dan tangkapan tinggi), apakah
 * resep itu muncul di 3 teratas susunan sistem?
 *
 * Aturan penting supaya angkanya jujur:
 * 1. Yang dievaluasi hanya **ulasan nyata yang sudah disetujui** dan tanggalnya tidak di masa depan.
 * 2. Ulasan yang sedang dinilai dikeluarkan dari bukti pemutus seri
 *    (leave-one-out), jadi tidak ada kebocoran: resep tidak dibantu oleh
 *    ulasan yang justru sedang diuji.
 * 3. Bila datanya belum cukup (`TUNING_TARGET`), laporan hanya menampilkan
 *    keadaan dan **tidak** menyarankan penggantian bobot.
 */
import { normalizeFishingType, type Recipe } from "@/data/recipes";
import { provinceDirectory } from "@/data/province-directory";
import {
  CANDIDATE_WEIGHT_SETS,
  MATCH_WEIGHTS,
  MATCH_WEIGHTS_VERSION,
  TUNING_TARGET,
  type MatchWeights,
} from "@/lib/recommendation-config";
import { getRecommendedRecipes, type UserPreferences } from "@/lib/recommendation";

/** Bentuk ulasan yang dibutuhkan evaluasi (mirip kolom `cms_reviews`). */
export type EvalReview = {
  recipeSlug: string;
  rating: number;
  weather?: string | null;
  water?: string | null;
  waterBody?: string | null;
  fishingType?: string | null;
  /** Lokasi bebas, mis. "Bogor, Jawa Barat". */
  location?: string | null;
  catchCount?: number | null;
  /** Durasi sesi dalam menit — dipakai menghitung laju tangkapan per jam. */
  sessionMinutes?: number | null;
  /** Jumlah joran (dilaporkan ke editor; belum dipakai untuk ambang). */
  rodCount?: number | null;
};

export type ReviewOutcome = {
  /** Rating ≥ 4 dan laju tangkapan tinggi (durasi sesi wajib diketahui). */
  strict: boolean;
  /** Rating ≥ 4 saja, dipakai sebagai pembanding yang lebih longgar. */
  ratingOnly: boolean;
  /** Laju tangkapan per jam; null kalau durasinya tidak disebut. */
  catchPerHour: number | null;
};

export type HitRateAtK = {
  /** Jumlah ulasan yang bisa dievaluasi (punya resep yang ada di katalog). */
  evaluable: number;
  hits: number;
  /** null berarti belum ada data — bukan 0. */
  hitRate: number | null;
};

export type RecommendationEvalReport = {
  generatedAt: string;
  weightsVersion: string;
  weights: MatchWeights;
  topK: number;
  minRating: number;
  highCatchMin: number;
  minStrictReviewsForTuning: number;
  ringkasan: {
    approvedRealReviews: number;
    /** Ulasan yang menyertakan angka hasil tangkapan. */
    withCatchCount: number;
    /** Ulasan yang juga menyebut durasi sesi (syarat laju per jam). */
    withSessionMinutes: number;
    /** Ulasan yang menyebut jumlah joran. */
    withRodCount: number;
    strictSuccess: number;
    ratingSuccess: number;
    /**
     * Rating ≥ 4 dan tangkapan ≥ angka absolut, tetapi **tanpa durasi** —
     * sengaja tidak dihitung sebagai "berhasil" karena angkanya tidak bisa
     * dibandingkan. Dilaporkan supaya tidak ada yang disembunyikan.
     */
    strictAbsoluteOnly: number;
    /** Ulasan yang resepnya tidak ada di katalog, jadi tidak bisa dinilai. */
    skippedUnknownRecipe: number;
  };
  criteria: { minRating: number; highCatchPerHourMin: number; minSessionMinutesForRate: number; highCatchMin: number };
  current: { strict: HitRateAtK; ratingOnly: HitRateAtK };
  candidates: { nama: string; weights: MatchWeights; strict: HitRateAtK; ratingOnly: HitRateAtK }[];
  recommendation: {
    /** true hanya kalau datanya sudah cukup untuk mengganti bobot. */
    dapatDituning: boolean;
    namaTerbaik: string | null;
    selisihHitRate: number | null;
    alasan: string;
  };
};

const allowedWeather = new Set(["Hujan", "Mendung", "Cerah", "Berawan", "Panas"]);
const allowedWater = new Set(["Keruh", "Hijau", "Jernih", "Kekuningan"]);
const allowedWaterBody = new Set(["Kolam", "Sungai", "Danau"]);

/**
 * Provinsi diambil dari bagian terakhir kolom lokasi ("Kota, Provinsi").
 * Kalau tidak cocok dengan daftar provinsi resmi, provinsi dianggap tidak
 * disebut — lebih baik kosong daripada menebak wilayah yang salah.
 */
export function provinceFromLocation(location?: string | null): string | undefined {
  if (!location) return undefined;
  const bagian = location.split(",").map((item) => item.trim()).filter(Boolean);
  for (const kandidat of [...bagian].reverse()) {
    const ditemukan = provinceDirectory.find((province) => province.name.toLowerCase() === kandidat.toLowerCase());
    if (ditemukan) return ditemukan.name;
  }
  return undefined;
}

/** Kondisi yang dilaporkan sebuah ulasan, dalam bentuk preferensi pengunjung. */
export function preferencesFromReview(review: EvalReview): UserPreferences {
  const preferences: UserPreferences = {};
  if (review.weather && allowedWeather.has(review.weather)) preferences.weather = review.weather;
  if (review.water && allowedWater.has(review.water)) preferences.water = review.water;
  if (review.waterBody && allowedWaterBody.has(review.waterBody)) preferences.waterBody = review.waterBody;
  if (review.fishingType) preferences.fishingType = normalizeFishingType(review.fishingType);
  const province = provinceFromLocation(review.location);
  if (province) preferences.province = province;
  return preferences;
}

/** Apakah ulasan ini menandakan resepnya berhasil? */
export function reviewOutcome(review: EvalReview): ReviewOutcome {
  // Rating harus di rentang 1–5: baris lama/impor yang nilainya di luar itu
  // tidak boleh dihitung sebagai bukti "berhasil".
  const ratingValid = Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5;
  const ratingOnly = ratingValid && review.rating >= TUNING_TARGET.minRating;
  const laju = evalCatchPerHour(review);
  const sesiCukup = typeof review.sessionMinutes === "number" && review.sessionMinutes >= TUNING_TARGET.minSessionMinutesForRate;
  const strict = ratingOnly && laju !== null && sesiCukup && laju >= TUNING_TARGET.highCatchPerHourMin;
  return { strict, ratingOnly, catchPerHour: laju };
}

/** Laju tangkapan per jam dari sebuah ulasan; null kalau durasinya tidak diisi. */
export function evalCatchPerHour(review: EvalReview): number | null {
  const tangkapan = typeof review.catchCount === "number" && Number.isFinite(review.catchCount) ? review.catchCount : null;
  const menit = typeof review.sessionMinutes === "number" && Number.isFinite(review.sessionMinutes) && review.sessionMinutes > 0 ? review.sessionMinutes : null;
  if (tangkapan === null || menit === null) return null;
  return tangkapan / (menit / 60);
}

type EvidenceMap = Record<string, { count: number; average: number }>;

/** Peta bukti pemutus seri (jumlah ulasan lalu rata-ratanya) untuk semua resep. */
export function evidenceMap(reviews: EvalReview[]): EvidenceMap {
  const map: EvidenceMap = {};
  for (const review of reviews) {
    const entri = map[review.recipeSlug] ?? { count: 0, average: 0 };
    entri.average = (entri.average * entri.count + review.rating) / (entri.count + 1);
    entri.count += 1;
    map[review.recipeSlug] = entri;
  }
  return map;
}

/**
 * Peta yang sama tanpa satu ulasan (leave-one-out), dihitung dengan mengoreksi
 * angka yang sudah ada — bukan dengan mengulang seluruh daftar.
 */
function leaveOneOut(map: EvidenceMap, review: EvalReview): EvidenceMap {
  const entri = map[review.recipeSlug];
  if (!entri) return map;
  const salinan: EvidenceMap = { ...map };
  const sisa = entri.count - 1;
  if (sisa <= 0) {
    delete salinan[review.recipeSlug];
    return salinan;
  }
  salinan[review.recipeSlug] = { count: sisa, average: (entri.average * entri.count - review.rating) / sisa };
  return salinan;
}

/** Peringkat sebuah resep (1 = teratas) untuk satu set kondisi. */
export function rankOf(
  recipes: Recipe[],
  preferences: UserPreferences,
  slug: string,
  ratings: EvidenceMap,
  weights: MatchWeights,
): { rank: number; total: number } | null {
  const urutan = getRecommendedRecipes(recipes, preferences, ratings, weights);
  const index = urutan.findIndex((recipe) => recipe.slug === slug);
  if (index < 0) return null;
  return { rank: index + 1, total: urutan.length };
}

/**
 * Hit-rate@K untuk satu set bobot.
 *
 * `mode` menentukan definisi berhasil: `"strict"` (rating dan tangkapan) atau
 * `"ratingOnly"` (rating saja). Ulasan tanpa angka tangkapan hanya ikut dihitung
 * pada mode `ratingOnly`.
 */
export function hitRateAtK(
  recipes: Recipe[],
  reviews: EvalReview[],
  weights: MatchWeights,
  mode: "strict" | "ratingOnly",
  topK: number = TUNING_TARGET.topK,
): HitRateAtK {
  const seluruhBukti = evidenceMap(reviews);
  let evaluable = 0;
  let hits = 0;
  for (const review of reviews) {
    const outcome = reviewOutcome(review);
    if (mode === "strict" ? !outcome.strict : !outcome.ratingOnly) continue;
    const posisi = rankOf(recipes, preferencesFromReview(review), review.recipeSlug, leaveOneOut(seluruhBukti, review), weights);
    if (!posisi) continue;
    evaluable += 1;
    if (posisi.rank <= topK) hits += 1;
  }
  return { evaluable, hits, hitRate: evaluable ? hits / evaluable : null };
}

/** Laporan lengkap: keadaan sekarang + kandidat bobot + saran (bila data cukup). */
export function buildRecommendationEvalReport(recipes: Recipe[], reviews: EvalReview[]): RecommendationEvalReport {
  const slugs = new Set(recipes.map((recipe) => recipe.slug));
  const ringkasan = {
    approvedRealReviews: reviews.length,
    withCatchCount: reviews.filter((review) => typeof review.catchCount === "number").length,
    withSessionMinutes: reviews.filter((review) => typeof review.sessionMinutes === "number").length,
    withRodCount: reviews.filter((review) => typeof review.rodCount === "number").length,
    strictSuccess: reviews.filter((review) => reviewOutcome(review).strict).length,
    ratingSuccess: reviews.filter((review) => reviewOutcome(review).ratingOnly).length,
    strictAbsoluteOnly: reviews.filter((review) => {
      const hasil = reviewOutcome(review);
      const tangkapan = typeof review.catchCount === "number" ? review.catchCount : null;
      return hasil.ratingOnly && hasil.catchPerHour === null && tangkapan !== null && tangkapan >= TUNING_TARGET.highCatchMin;
    }).length,
    skippedUnknownRecipe: reviews.filter((review) => !slugs.has(review.recipeSlug)).length,
  };

  const candidates = CANDIDATE_WEIGHT_SETS.map((kandidat) => ({
    nama: kandidat.nama,
    weights: kandidat.weights,
    strict: hitRateAtK(recipes, reviews, kandidat.weights, "strict"),
    ratingOnly: hitRateAtK(recipes, reviews, kandidat.weights, "ratingOnly"),
  }));

  const sekarang = candidates.find((kandidat) => kandidat.weights === MATCH_WEIGHTS) ?? candidates[0];
  const cukupData = ringkasan.strictSuccess >= TUNING_TARGET.minStrictReviewsForTuning;
  const denganHitRate = candidates.filter((kandidat) => kandidat.strict.hitRate !== null);
  const terbaik = [...denganHitRate].sort((a, b) => (b.strict.hitRate ?? 0) - (a.strict.hitRate ?? 0))[0];
  const selisih = terbaik && sekarang.strict.hitRate !== null ? (terbaik.strict.hitRate ?? 0) - sekarang.strict.hitRate : null;

  const syarat = `rating ≥ ${TUNING_TARGET.minRating} dan laju tangkapan ≥ ${TUNING_TARGET.highCatchPerHourMin.toLocaleString("id-ID")} ekor/jam (sesi ≥ ${TUNING_TARGET.minSessionMinutesForRate} menit)`;
  const alasanBelumDituning = ringkasan.strictSuccess === 0
    ? `Belum ada ulasan yang memenuhi syarat "berhasil" (${syarat}). Durasi sesi, jumlah joran, dan hasil tangkapan semuanya opsional, jadi angkanya tumbuh seiring ulasan baru.${ringkasan.strictAbsoluteOnly ? ` ${ringkasan.strictAbsoluteOnly} ulasan menyebut tangkapan ≥ ${TUNING_TARGET.highCatchMin} ekor tanpa durasi, jadi belum bisa dibandingkan.` : ""}`
    : `Baru ${ringkasan.strictSuccess} ulasan memenuhi syarat "berhasil" — minimal ${TUNING_TARGET.minStrictReviewsForTuning} agar hasil tuning layak dipercaya.`;

  return {
    generatedAt: new Date().toISOString(),
    weightsVersion: MATCH_WEIGHTS_VERSION,
    weights: MATCH_WEIGHTS,
    topK: TUNING_TARGET.topK,
    minRating: TUNING_TARGET.minRating,
    highCatchMin: TUNING_TARGET.highCatchMin,
    minStrictReviewsForTuning: TUNING_TARGET.minStrictReviewsForTuning,
    criteria: {
      minRating: TUNING_TARGET.minRating,
      highCatchPerHourMin: TUNING_TARGET.highCatchPerHourMin,
      minSessionMinutesForRate: TUNING_TARGET.minSessionMinutesForRate,
      highCatchMin: TUNING_TARGET.highCatchMin,
    },
    ringkasan,
    current: { strict: sekarang.strict, ratingOnly: sekarang.ratingOnly },
    candidates,
    recommendation: {
      dapatDituning: cukupData,
      namaTerbaik: cukupData && terbaik ? terbaik.nama : null,
      selisihHitRate: cukupData ? selisih : null,
      alasan: cukupData
        ? `Ringkasan sudah cukup: kandidat "${terbaik?.nama}" menang ${formatPersen(selisih)} dibanding bobot sekarang. Ganti bobot di @/lib/recommendation-config setelah memeriksa ulang.`
        : alasanBelumDituning,
    },
  };
}

export function formatPersen(nilai: number | null): string {
  if (nilai === null) return "belum ada data";
  return `${(nilai * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}
