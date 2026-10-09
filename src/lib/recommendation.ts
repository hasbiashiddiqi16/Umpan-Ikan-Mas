import type { Recipe } from "@/data/recipes";

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

/** Deterministic 0–100 score using the product's published recommendation weights. */
export function calculateMatchScore(recipe: Recipe, preferences: UserPreferences): number {
  const points =
    (preferences.water && recipe.water.includes(preferences.water as Recipe["water"][number]) ? 25 : 0) +
    (preferences.weather && recipe.weather.includes(preferences.weather as Recipe["weather"][number]) ? 20 : 0) +
    (preferences.fishingType && recipe.fishingTypes.includes(preferences.fishingType as Recipe["fishingTypes"][number]) ? 20 : 0) +
    (preferences.province && recipe.provinces.includes(preferences.province) ? 15 : 0) +
    (preferences.season && recipe.seasons.includes(preferences.season) ? 10 : 0) +
    (recipe.rating / 5) * 5 +
    (recipe.popularity / 100) * 5;

  return Math.max(0, Math.min(100, Math.round(points)));
}

export function getRecommendedRecipes<T extends Recipe>(recipes: T[], preferences: UserPreferences): T[] {
  return [...recipes].sort((a, b) => {
    const scoreDifference = calculateMatchScore(b, preferences) - calculateMatchScore(a, preferences);
    return scoreDifference || b.rating - a.rating || b.users - a.users;
  });
}

export function filterRecipesByBudget<T extends Recipe>(recipes: T[], budget?: string): T[] {
  const range = budget ? budgetRanges[budget] : undefined;
  if (!range) return recipes;
  return recipes.filter((recipe) => recipe.priceValue >= range[0] && recipe.priceValue <= range[1]);
}
