export type RecipeRating = { count: number; average: number };
export type RecipeRatingMap = Record<string, RecipeRating>;

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

/** Slug resep paling banyak diulas, dengan penyimpanan sementara agar murah dipakai per kartu. */
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
  return `${jumlah} — satu ulasan berarti satu pemancing yang mencoba${sampleCount ? "; ulasan contoh berlabel tidak dihitung" : ""}.`;
}

/** Rangkuman kondisi yang dipilih pengunjung, untuk menjelaskan asal skor kecocokan. */
export function describePreferences(preferences: { province?: string; weather?: string; water?: string; fishingType?: string; season?: string; budget?: string }): string {
  return [preferences.province, preferences.weather, preferences.water, preferences.fishingType, preferences.budget, preferences.season]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}
