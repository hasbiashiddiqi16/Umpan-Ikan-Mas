/**
 * Evaluasi urutan rekomendasi dengan **hit-rate@3**.
 *
 * Pertanyaan yang dijawab: kalau pengunjung melaporkan kondisi mancingnya dan
 * resep yang dipakainya **berhasil** (rating ≥ 4 dan tangkapan tinggi), apakah
 * resep itu muncul di 3 teratas susunan sistem?
 *
 * Aturan penting supaya angkanya jujur:
 * 1. Yang dievaluasi hanya **ulasan nyata yang sudah disetujui** dan bukan
 *    ulasan contoh (`seed_key` kosong, tanggalnya tidak di masa depan).
 * 2. Ulasan yang sedang dinilai dikeluarkan dari bukti pemutus seri
 *    (leave-one-out), jadi tidak ada kebocoran: resep tidak dibantu oleh
 *    ulasan yang justru sedang diuji.
 * 3. Bila sampelnya belum cukup (`TUNING_TARGET`), laporan hanya menampilkan
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
};

export type ReviewOutcome = {
  /** Rating ≥ 4 dan tangkapan tinggi — definisi "berhasil" yang disepakati. */
  strict: boolean;
  /** Rating ≥ 4 saja, dipakai sebagai pembanding yang lebih longgar. */
  ratingOnly: boolean;
};

export type HitRateAtK = {
  /** Jumlah ulasan yang bisa dievaluasi (punya resep yang ada di katalog). */
  evaluable: number;
  hits: number;
  /** null berarti belum ada sampel — bukan 0. */
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
  sample: {
    approvedRealReviews: number;
    /** Ulasan yang menyertakan angka hasil tangkapan. */
    withCatchCount: number;
    strictSuccess: number;
    ratingSuccess: number;
    /** Ulasan yang resepnya tidak ada di katalog, jadi tidak bisa dinilai. */
    skippedUnknownRecipe: number;
  };
  current: { strict: HitRateAtK; ratingOnly: HitRateAtK };
  candidates: { nama: string; weights: MatchWeights; strict: HitRateAtK; ratingOnly: HitRateAtK }[];
  recommendation: {
    /** true hanya kalau sampelnya sudah cukup untuk mengganti bobot. */
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
  const tangkapan = typeof review.catchCount === "number" && Number.isFinite(review.catchCount) ? review.catchCount : null;
  const strict = ratingOnly && tangkapan !== null && tangkapan >= TUNING_TARGET.highCatchMin;
  return { strict, ratingOnly };
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

/** Laporan lengkap: keadaan sekarang + kandidat bobot + saran (bila sampel cukup). */
export function buildRecommendationEvalReport(recipes: Recipe[], reviews: EvalReview[]): RecommendationEvalReport {
  const slugs = new Set(recipes.map((recipe) => recipe.slug));
  const sample = {
    approvedRealReviews: reviews.length,
    withCatchCount: reviews.filter((review) => typeof review.catchCount === "number").length,
    strictSuccess: reviews.filter((review) => reviewOutcome(review).strict).length,
    ratingSuccess: reviews.filter((review) => reviewOutcome(review).ratingOnly).length,
    skippedUnknownRecipe: reviews.filter((review) => !slugs.has(review.recipeSlug)).length,
  };

  const candidates = CANDIDATE_WEIGHT_SETS.map((kandidat) => ({
    nama: kandidat.nama,
    weights: kandidat.weights,
    strict: hitRateAtK(recipes, reviews, kandidat.weights, "strict"),
    ratingOnly: hitRateAtK(recipes, reviews, kandidat.weights, "ratingOnly"),
  }));

  const sekarang = candidates.find((kandidat) => kandidat.weights === MATCH_WEIGHTS) ?? candidates[0];
  const cukupSampel = sample.strictSuccess >= TUNING_TARGET.minStrictReviewsForTuning;
  const denganHitRate = candidates.filter((kandidat) => kandidat.strict.hitRate !== null);
  const terbaik = [...denganHitRate].sort((a, b) => (b.strict.hitRate ?? 0) - (a.strict.hitRate ?? 0))[0];
  const selisih = terbaik && sekarang.strict.hitRate !== null ? (terbaik.strict.hitRate ?? 0) - sekarang.strict.hitRate : null;

  const alasanBelumDituning = sample.strictSuccess === 0
    ? `Belum ada ulasan yang memenuhi syarat "berhasil" (rating ≥ ${TUNING_TARGET.minRating} dan tangkapan ≥ ${TUNING_TARGET.highCatchMin} ekor). Hasil tangkapan bersifat opsional di formulir, jadi angkanya akan tumbuh seiring ulasan baru.`
    : `Baru ${sample.strictSuccess} ulasan memenuhi syarat "berhasil" — minimal ${TUNING_TARGET.minStrictReviewsForTuning} agar hasil tuning layak dipercaya.`;

  return {
    generatedAt: new Date().toISOString(),
    weightsVersion: MATCH_WEIGHTS_VERSION,
    weights: MATCH_WEIGHTS,
    topK: TUNING_TARGET.topK,
    minRating: TUNING_TARGET.minRating,
    highCatchMin: TUNING_TARGET.highCatchMin,
    minStrictReviewsForTuning: TUNING_TARGET.minStrictReviewsForTuning,
    sample,
    current: { strict: sekarang.strict, ratingOnly: sekarang.ratingOnly },
    candidates,
    recommendation: {
      dapatDituning: cukupSampel,
      namaTerbaik: cukupSampel && terbaik ? terbaik.nama : null,
      selisihHitRate: cukupSampel ? selisih : null,
      alasan: cukupSampel
        ? `Sampel sudah cukup: kandidat "${terbaik?.nama}" menang ${formatPersen(selisih)} dibanding bobot sekarang. Ganti bobot di @/lib/recommendation-config setelah memeriksa ulang.`
        : alasanBelumDituning,
    },
  };
}

export function formatPersen(nilai: number | null): string {
  if (nilai === null) return "belum ada data";
  return `${(nilai * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}
