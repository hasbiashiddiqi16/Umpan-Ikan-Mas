export type RecipeRating = { count: number; average: number };
export type RecipeRatingMap = Record<string, RecipeRating>;

/**
 * Ambang `m` pada pemeringkatan rata-rata Bayesian.
 *
 * Dipakai untuk urutan "Rating Tertinggi": resep dengan sedikit ulasan tidak
 * boleh menyalip resep yang diulas jauh lebih banyak hanya karena rata-ratanya
 * pas 5,0. Nilai 20 berarti sebuah resep baru dianggap setara separuh jalan
 * antara rata-ratanya sendiri dan rata-rata seluruh ulasan.
 */
export const BAYESIAN_MIN_REVIEWS = 20;

export const BAYESIAN_HINT =
  "Peringkat memakai rata-rata Bayesian (m=20): rata-rata resep dengan sedikit ulasan ditarik ke rata-rata seluruh ulasan, jadi 5 ulasan bintang 5 tidak langsung menyalip resep yang diulas ratusan pemancing.";

/**
 * Ambang label "Populer".
 *
 * "Populer" bukan angka dan bukan data karangan: label ini hanya diberikan pada
 * resep yang paling banyak diulas pengunjung. Sumbernya satu — jumlah ulasan
 * asli yang sudah disetujui (tabel ulasan). Selama belum ada resep yang
 * memenuhi ambang ini, tidak ada satu pun label "Populer" yang tampil.
 */
export const POPULAR_MIN_REVIEWS = 2;
export const POPULAR_LIMIT = 10;

export const POPULAR_HINT = "Paling banyak diulas pengunjung (dihitung dari ulasan asli yang disetujui)";

let cachedMap: RecipeRatingMap | null = null;
let cachedPopular: Set<string> = new Set();

/**
 * Slug resep paling banyak diulas, dengan penyimpanan sementara agar murah
 * dipakai per kartu. Urutannya berbasis jumlah ulasan; rata-rata hanya pemutus
 * seri, jadi label "Populer" tidak ikut berubah oleh skor Bayesian.
 */
export function popularRecipeSlugs(ratings: RecipeRatingMap, limit = POPULAR_LIMIT, minimum = POPULAR_MIN_REVIEWS): Set<string> {
  if (ratings === cachedMap) return cachedPopular;
  const layak = Object.entries(ratings)
    .filter(([, rating]) => rating.count >= minimum)
    .sort((a, b) => b[1].count - a[1].count || b[1].average - a[1].average);
  cachedMap = ratings;
  cachedPopular = new Set(layak.slice(0, limit).map(([slug]) => slug));
  return cachedPopular;
}

export function isPopularRecipe(ratings: RecipeRatingMap, slug: string): boolean {
  return popularRecipeSlugs(ratings).has(slug);
}

/**
 * Rata-rata seluruh ulasan yang sudah disetujui (nilai `C` pada rumus Bayesian).
 *
 * Dihitung dari **setiap ulasan** (jumlah ulasan × rata-rata resep), bukan
 * rata-rata dari rata-rata resep, supaya resep dengan satu ulasan tidak
 * berbobot sama dengan resep dengan ratusan ulasan. Mengembalikan `null` bila
 * belum ada ulasan sama sekali — tanpa angka, tidak ada skor yang dikarang.
 */
export function globalReviewAverage(ratings: RecipeRatingMap): number | null {
  let totalUlasan = 0;
  let jumlahBintang = 0;
  for (const rating of Object.values(ratings)) {
    if (!rating || rating.count <= 0) continue;
    totalUlasan += rating.count;
    jumlahBintang += rating.average * rating.count;
  }
  return totalUlasan > 0 ? jumlahBintang / totalUlasan : null;
}

/**
 * Skor rata-rata Bayesian untuk pemeringkatan:
 *
 *     skor = v/(v+m) · R + m/(v+m) · C
 *
 * dengan `v` jumlah ulasan resep, `R` rata-rata resep, `C` rata-rata seluruh
 * ulasan (`globalReviewAverage`), dan `m` ambang (bawaan 20).
 *
 * Skor ini **hanya untuk mengurutkan**, bukan angka yang ditampilkan: kartu
 * resep tetap menampilkan rata-rata asli dan jumlah ulasannya. Mengembalikan
 * `null` bila resep belum punya ulasan atau rata-rata global belum diketahui,
 * sehingga resep tanpa ulasan tidak pernah mendapat posisi dari angka karangan.
 */
export function bayesianRatingScore(
  rating: RecipeRating | undefined,
  globalAverage: number | null,
  minReviews: number = BAYESIAN_MIN_REVIEWS,
): number | null {
  if (!rating || rating.count <= 0 || globalAverage === null || !Number.isFinite(globalAverage)) return null;
  const v = rating.count;
  const m = Math.max(0, minReviews);
  const bobot = v / (v + m);
  return bobot * rating.average + (1 - bobot) * globalAverage;
}

/**
 * Pembanding siap pakai untuk urutan "Rating Tertinggi" di katalog.
 *
 * Skor dihitung sekali per resep (bukan berulang di dalam pembanding), lalu
 * diurutkan: skor tertinggi lebih dulu, seri diputus oleh jumlah ulasan (lebih
 * banyak lebih dulu), dan resep tanpa ulasan selalu di bawah resep yang
 * sudah punya ulasan.
 */
export function ratingScoreRanker(
  ratings: RecipeRatingMap,
  globalAverage: number | null,
  minReviews: number = BAYESIAN_MIN_REVIEWS,
): (a: { slug: string }, b: { slug: string }) => number {
  const skor = new Map<string, number>();
  for (const [slug, rating] of Object.entries(ratings)) {
    const nilai = bayesianRatingScore(rating, globalAverage, minReviews);
    if (nilai !== null) skor.set(slug, nilai);
  }
  return (a, b) => {
    const skorA = skor.get(a.slug);
    const skorB = skor.get(b.slug);
    if (skorA === undefined && skorB === undefined) return 0;
    if (skorA === undefined) return 1;
    if (skorB === undefined) return -1;
    return skorB - skorA || (ratings[b.slug]?.count ?? 0) - (ratings[a.slug]?.count ?? 0) || a.slug.localeCompare(b.slug);
  };
}

/**
 * Penjelasan angka rating: semua angka di situs ini berasal dari satu sumber,
 * yaitu ulasan pengunjung yang sudah disetujui. Satu ulasan = satu pemancing
 * yang mencoba racikan tersebut, jadi "pemancing mencoba" tidak pernah lebih
 * besar dari jumlah ulasan.
 */
export function describeRating(rating?: RecipeRating, sampleCount = 0) {
  if (!rating || rating.count === 0) {
    return "Belum ada ulasan pengunjung. Contoh ulasan berlabel tidak ikut dihitung.";
  }
  const jumlah = `${new Intl.NumberFormat("id-ID").format(rating.count)} ulasan pengunjung yang disetujui`;
  return `${jumlah} — satu ulasan berarti satu pemancing yang mencoba.${sampleCount ? " Ulasan contoh berlabel tidak dihitung." : ""}`;
}

/** Rangkuman kondisi yang dipilih pengunjung, untuk menjelaskan asal skor kecocokan. */
export function describePreferences(preferences: { province?: string; weather?: string; water?: string; waterBody?: string; fishingType?: string; season?: string; budget?: string }): string {
  return [preferences.province, preferences.waterBody, preferences.weather, preferences.water, preferences.fishingType, preferences.budget, preferences.season]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}
