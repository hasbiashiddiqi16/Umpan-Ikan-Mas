import { provinceDirectory } from "@/data/province-directory";
import { recipes } from "@/data/recipes";

export type Province = {
  name: string;
  slug: string;
  recipeCount: number;
};

/**
 * Ringkasan per provinsi berasal dari katalog. Jumlah ulasan sengaja **tidak**
 * disimpan di sini: angka itu hanya boleh datang dari ulasan asli yang disetujui
 * (lihat `getRecipeRatings()`), supaya tidak ada ulasan contoh yang ikut terhitung.
 * Resep "populer" juga tidak disimpan di sini: kartu provinsi menerimanya dari
 * `popularRecipeFor()` / daftar ulasan nyata, bukan dari angka popularitas katalog.
 */
export const provinces: Province[] = provinceDirectory.map((province) => {
  const regionalRecipes = recipes.filter((recipe) => recipe.provinces.includes(province.name));

  return {
    ...province,
    recipeCount: regionalRecipes.length,
  };
});
