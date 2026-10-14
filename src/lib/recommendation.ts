import { normalizeFishingType, type Recipe, type WaterBody } from "@/data/recipes";
import { MATCH_WEIGHTS, type MatchWeights } from "@/lib/recommendation-config";

export type UserPreferences = {
  province?: string;
  weather?: string;
  /** Kondisi air (keruh/hijau/jernih/kekuningan), bukan tipe perairannya. */
  water?: string;
  /** Tipe perairan: "Kolam", "Sungai", atau "Danau" (lihat `WaterBody`). */
  waterBody?: string;
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
 * Bobot skor kecocokan kini tinggal di `@/lib/recommendation-config` supaya ada
 * satu tempat untuk menulis, menjelaskan alasan, dan menyatakan statusnya
 * (masih dugaan sampai diuji dengan hit-rate@3). Diekspor ulang di sini agar
 * pemanggil lama tidak putus.
 */
export { MATCH_WEIGHTS };

/**
 * Skor kecocokan 0–100 terhadap kondisi yang diberikan pengunjung.
 *
 * `weights` bisa diganti supaya laporan evaluasi (`@/lib/recommendation-eval`)
 * bisa menguji beberapa kandidat bobot dengan **fungsi yang sama** seperti yang
 * dipakai situs — tidak ada perhitungan tandingan yang bisa berbeda hasil.
 */
export function calculateMatchScore(recipe: Recipe, preferences: UserPreferences, weights: MatchWeights = MATCH_WEIGHTS): number {
  const points =
    (preferences.waterBody && recipe.waterBodies.includes(preferences.waterBody as WaterBody) ? weights.waterBody : 0) +
    (preferences.water && recipe.water.includes(preferences.water as Recipe["water"][number]) ? weights.water : 0) +
    (preferences.weather && recipe.weather.includes(preferences.weather as Recipe["weather"][number]) ? weights.weather : 0) +
    (preferences.fishingType && recipe.fishingTypes
      .map(normalizeFishingType)
      .includes(normalizeFishingType(preferences.fishingType)) ? weights.fishingType : 0) +
    (preferences.province && recipe.provinces.includes(preferences.province) ? weights.province : 0) +
    (preferences.season && recipe.seasons.includes(preferences.season) ? weights.season : 0);

  return Math.max(0, Math.min(100, Math.round(points)));
}

export function getRecommendedRecipes<T extends Recipe>(
  recipes: T[],
  preferences: UserPreferences,
  ratings?: Record<string, { count: number; average: number }>,
  weights: MatchWeights = MATCH_WEIGHTS,
): T[] {
  return [...recipes].sort((a, b) => {
    const scoreDifference = calculateMatchScore(b, preferences, weights) - calculateMatchScore(a, preferences, weights);
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
