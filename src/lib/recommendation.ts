import { normalizeFishingType, type Recipe } from "@/data/recipes";

export type UserPreferences = {
  province?: string;
  weather?: string;
  water?: string;
  fishingType?: string;
  season?: string;
  budget?: string;
};

const budgetRanges: Record<string, [number, number]> = {
  "< Rp15.000": [0, 14999],
  "Rp15.000–30.000": [15000, 30000],
  "Rp30.000–50.000": [30001, 50000],
  "> Rp50.000": [50001, Number.POSITIVE_INFINITY],
};

/**
 * Bobot skor kecocokan. Semua bobot berasal dari kondisi yang **diisi
 * pengunjung** (air, cuaca, jenis pemancingan, provinsi, musim) dan jumlahnya
 * tepat 100. Tidak ada angka katalog yang ikut dihitung, karena satu-satunya
 * angka komunitas di situs ini berasal dari tabel ulasan.
 */
export const MATCH_WEIGHTS = { water: 30, weather: 22, fishingType: 22, province: 16, season: 10 } as const;

/** Skor kecocokan 0–100 terhadap kondisi yang diberikan pengunjung. */
export function calculateMatchScore(recipe: Recipe, preferences: UserPreferences): number {
  const points =
    (preferences.water && recipe.water.includes(preferences.water as Recipe["water"][number]) ? MATCH_WEIGHTS.water : 0) +
    (preferences.weather && recipe.weather.includes(preferences.weather as Recipe["weather"][number]) ? MATCH_WEIGHTS.weather : 0) +
    (preferences.fishingType && recipe.fishingTypes
      .map(normalizeFishingType)
      .includes(normalizeFishingType(preferences.fishingType)) ? MATCH_WEIGHTS.fishingType : 0) +
    (preferences.province && recipe.provinces.includes(preferences.province) ? MATCH_WEIGHTS.province : 0) +
    (preferences.season && recipe.seasons.includes(preferences.season) ? MATCH_WEIGHTS.season : 0);

  return Math.max(0, Math.min(100, Math.round(points)));
}

export function getRecommendedRecipes<T extends Recipe>(
  recipes: T[],
  preferences: UserPreferences,
  ratings?: Record<string, { count: number; average: number }>,
): T[] {
  return [...recipes].sort((a, b) => {
    const scoreDifference = calculateMatchScore(b, preferences) - calculateMatchScore(a, preferences);
    if (scoreDifference) return scoreDifference;
    // Seri diputus oleh bukti komunitas nyata: jumlah ulasan lalu rata-ratanya.
    // Jumlah ulasan yang menentukan, jadi rata-rata di sini hanya pemutus seri
    // pada jumlah yang sama — urutannya setara dengan skor Bayesian.
    const countDifference = (ratings?.[b.slug]?.count ?? 0) - (ratings?.[a.slug]?.count ?? 0);
    if (countDifference) return countDifference;
    return (ratings?.[b.slug]?.average ?? 0) - (ratings?.[a.slug]?.average ?? 0);
  });
}

export function filterRecipesByBudget<T extends Recipe>(recipes: T[], budget?: string): T[] {
  const range = budget ? budgetRanges[budget] : undefined;
  if (!range) return recipes;
  return recipes.filter((recipe) => recipe.priceValue >= range[0] && recipe.priceValue <= range[1]);
}
