import type { Recipe, RecipeCategory } from "@/data/recipes";

export type RecipeBadgeTone = "sage" | "gold" | "cream" | "dark";

/**
 * Badge resep — **satu-satunya** tempat teks badge ditentukan.
 *
 * Teksnya diambil dari satu field data saja, yaitu `recipe.category`, dan field
 * itu sendiri diturunkan dari `recipe.fishingTypes` (lihat `primaryFishingType`
 * di `@/data/recipes`). Karena sumbernya sama dengan tag kondisi di kartu,
 * badge tidak mungkin lagi bertentangan dengan tag — mis. badge "Lomba" dengan
 * tag "Harian", atau badge "Rekomendasi" pada resep bertag "Lomba".
 *
 * Badge juga tidak lagi dipilih berdasarkan urutan kartu (`featured`): setiap
 * kartu menampilkan jenis resep yang sebenarnya.
 */
const BADGE_BY_CATEGORY: Record<RecipeCategory, { tone: RecipeBadgeTone; title: string }> = {
  Harian: { tone: "cream", title: "Resep untuk kolam harian (jenis pemancingan resep)" },
  Lomba: { tone: "gold", title: "Resep untuk kolam lomba (jenis pemancingan resep)" },
  Galatama: { tone: "sage", title: "Resep untuk kolam galatama (jenis pemancingan resep)" },
};

export function recipeBadge(recipe: Recipe): { label: RecipeCategory; tone: RecipeBadgeTone; title: string } {
  const tampilan = BADGE_BY_CATEGORY[recipe.category] ?? BADGE_BY_CATEGORY.Harian;
  return { label: recipe.category, ...tampilan };
}

/**
 * Seluruh jenis pemancingan resep, ditampilkan sebagai tag kondisi. Teks
 * pertamanya selalu sama dengan badge di atas gambar.
 */
export function fishingTypeTag(recipe: Recipe): string {
  return recipe.fishingTypes.join(" / ");
}
