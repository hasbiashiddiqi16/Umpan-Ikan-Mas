import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { recipes as seedRecipes, type Recipe } from "@/data/recipes";
import { cmsRecipeToRecipe, mergeRecipesBySlug, normalizeCmsRecipeRecord, type CmsRecipeRecord } from "@/lib/cms";

export type PublicRecipeData = {
  /** Daftar resep yang boleh tampil ke pengunjung: katalog bawaan ditimpa data dashboard yang terbit. */
  recipes: Recipe[];
  /** Semua slug yang dikelola dashboard (status apa pun), untuk komponen klien yang menggabungkan datanya sendiri. */
  managedSlugs: string[];
};

/**
 * Satu sumber kebenaran daftar resep publik.
 *
 * Sebelumnya halaman-halaman server (beranda, provinsi, cuaca, racikan
 * terkait) hanya membaca katalog bawaan di `src/data/recipes.ts`, jadi
 * resep yang ditambah/diubah dari dashboard tidak pernah terhitung di
 * sana — jumlah resep publik tidak sesuai dengan dashboard. Kini semua
 * permukaan publik memakai daftar ini:
 *
 * - Resep dashboard berstatus `published` menimpa versi katalog bawaan
 *   dengan slug yang sama (data dashboard yang menang, sama seperti
 *   halaman detail dan sitemap).
 * - Resep katalog yang di dashboard masih draft/arsip disembunyikan.
 * - Bila basis data tak terjangkau, katalog bawaan tetap tampil apa
 *   adanya (perilaku ketahanan lama), bukan halaman kosong.
 *
 * Hasilnya di-cache per render (React `cache`) agar beberapa pulau
 * Suspense di satu halaman tidak mengulang query yang sama.
 */
async function bacaDariBasisData(): Promise<PublicRecipeData> {
  const [publishedRows, managedRows] = await Promise.all([
    db.select().from(cmsRecipes).where(eq(cmsRecipes.status, "published")),
    db.select({ slug: cmsRecipes.slug, status: cmsRecipes.status }).from(cmsRecipes),
  ]);
  const managed = publishedRows.map((row) => cmsRecipeToRecipe(normalizeCmsRecipeRecord(row as unknown as CmsRecipeRecord)));
  const belumTerbit = new Set(managedRows.filter((row) => row.status !== "published").map((row) => row.slug));
  const katalogTerlihat = seedRecipes.filter((recipe) => !belumTerbit.has(recipe.slug));
  return {
    recipes: mergeRecipesBySlug(katalogTerlihat, managed),
    managedSlugs: managedRows.map((row) => row.slug),
  };
}

export const getPublicRecipeData = cache(async (): Promise<PublicRecipeData> => {
  try {
    return await bacaDariBasisData();
  } catch {
    // Kegagalan koneksi sesaat (pooler basis data penuh/koneksi putus)
    // biasanya lolos pada percobaan kedua; tanpa coba ulang, halaman ISR
    // akan menyimpan versi katalog bawaan sebagai hitungan yang basi.
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return await bacaDariBasisData();
    } catch (error) {
      console.error("Gagal membaca daftar resep publik dari basis data:", error);
      return { recipes: [...seedRecipes], managedSlugs: [] };
    }
  }
});

/** Daftar resep publik gabungan (katalog bawaan + dashboard terbit). */
export async function getPublicRecipes(): Promise<Recipe[]> {
  return (await getPublicRecipeData()).recipes;
}

/** Jumlah resep publik yang dikaitkan dengan satu provinsi. */
export function countRecipesForProvince(publicRecipes: readonly Recipe[], provinceName: string): number {
  return publicRecipes.filter((recipe) => recipe.provinces.includes(provinceName)).length;
}
