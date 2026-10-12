import { provinceDirectory } from "@/data/province-directory";
import { recipes } from "@/data/recipes";
import { reviews } from "@/data/reviews";

export type Province = {
  name: string;
  slug: string;
  recipeCount: number;
  reviewCount: number;
  popularRecipe: string;
};

/**
 * Ringkasan per provinsi berasal langsung dari katalog dan ulasan seed,
 * sehingga angka pada kartu daerah selalu konsisten dengan data yang tampil.
 */
export const provinces: Province[] = provinceDirectory.map((province) => {
  const regionalRecipes = recipes.filter((recipe) => recipe.provinces.includes(province.name));
  const recipeSlugs = new Set(regionalRecipes.map((recipe) => recipe.slug));
  const popularRecipe = [...regionalRecipes].sort((first, second) => second.users - first.users)[0];

  return {
    ...province,
    recipeCount: regionalRecipes.length,
    reviewCount: reviews.filter((review) => recipeSlugs.has(review.recipeSlug)).length,
    popularRecipe: popularRecipe?.name ?? "Belum ada racikan",
  };
});
