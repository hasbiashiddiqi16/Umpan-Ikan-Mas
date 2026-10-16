import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { recipes as seedRecipes, type Recipe } from "@/data/recipes";
import { cmsRecipeToRecipe, mergeRecipesBySlug, normalizeCmsRecipeRecord, type CmsRecipeRecord } from "@/lib/cms";
import { bacaDenganCobaUlang, sedangPrerenderBuild } from "@/lib/db-retry";

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
 * - Katalog bawaan hanya dipakai bila basis data memang tidak
 *   terkonfigurasi (pengembangan lokal) atau saat build. Bila basis
 *   data terkonfigurasi tetapi gagal dibaca saat runtime, bacaannya
 *   dicoba ulang lewat `bacaDenganCobaUlang` lalu DILEMPAR sebagai
 *   galat — bukan dikembalikan sebagai katalog bawaan. Alasannya:
 *   halaman-halaman pemakai daftar ini memakai ISR, jadi katalog
 *   bawaan hasil satu kegagalan sesaat akan tersimpan sebagai
 *   hitungan basi sampai satu jam (pernah terjadi: beranda
 *   menampilkan 3 resep lama padahal dashboard sudah punya 7).
 *   Dengan melempar, ISR mempertahankan versi baik terakhir dan
 *   kunjungan berikutnya mencoba lagi.
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
  // Tanpa basis data terkonfigurasi (pengembangan lokal), katalog
  // bawaan adalah satu-satunya sumber dan memang yang diharapkan.
  if (!isDatabaseConfigured()) {
    return { recipes: [...seedRecipes], managedSlugs: [] };
  }
  try {
    return await bacaDenganCobaUlang(bacaDariBasisData);
  } catch (error) {
    console.error("Gagal membaca daftar resep publik dari basis data:", error);
    // Saat build (prerender) jangan gagalkan build hanya karena
    // basis data tak terjangkau: pakai katalog bawaan, halaman akan
    // menggambar ulang dengan data asli pada revalidasi pertama.
    if (sedangPrerenderBuild()) {
      return { recipes: [...seedRecipes], managedSlugs: [] };
    }
    // Runtime: lempar agar render ini tidak disimpan ke cache ISR
    // sebagai hitungan katalog bawaan yang basi (lihat catatan di
    // kepala berkas). Versi baik terakhir tetap disajikan dan
    // halaman pulih sendiri begitu basis data menjawab lagi.
    throw new Error("Basis data resep sedang tidak terjangkau. Coba lagi sesaat lagi.");
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
