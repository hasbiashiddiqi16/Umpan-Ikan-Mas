import { provinceDirectory } from "@/data/province-directory";
import { recipes } from "@/data/recipes";

export type Province = {
  name: string;
  slug: string;
  recipeCount: number;
  popularRecipe: string;
};

/**
 * Ringkasan per provinsi berasal dari katalog. Jumlah ulasan sengaja **tidak**
 * disimpan di sini: angka itu hanya boleh datang dari ulasan asli yang disetujui
 * (lihat `getRecipeRatings()`), supaya tidak ada ulasan contoh yang ikut terhitung.
 */
export const provinces: Province[] = provinceDirectory.map((province) => {
  const regionalRecipes = recipes.filter((recipe) => recipe.provinces.includes(province.name));
  const popularRecipe = [...regionalRecipes].sort((first, second) => second.users - first.users)[0];

  return {
    ...province,
    recipeCount: regionalRecipes.length,
    popularRecipe: popularRecipe?.name ?? "Belum ada racikan",
  };
});
