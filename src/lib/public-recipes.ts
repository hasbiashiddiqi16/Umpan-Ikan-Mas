import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { cmsRecipes } from "@/db/schema";
import type { Recipe } from "@/data/recipes";
import { cmsRecipeToRecipe, normalizeCmsRecipeRecord, type CmsRecipeRecord } from "@/lib/cms";
import { bacaDenganCobaUlang, sedangPrerenderBuild } from "@/lib/db-retry";

export type PublicRecipeData = {
  /** Daftar resep yang boleh tampil ke pengunjung: hanya resep basis data berstatus terbit. */
  recipes: Recipe[];
  /** Semua slug yang dikelola dashboard (status apa pun), untuk komponen klien yang menggabungkan datanya sendiri. */
  managedSlugs: string[];
};

/**
 * Satu sumber kebenaran daftar resep publik.
 *
 * Satu-satunya sumber resep publik adalah basis data: resep dari dashboard maupun kiriman
 * pengguna yang berstatus `published`. Semua permukaan publik memakai
 * daftar ini supaya jumlah resep selalu sesuai dengan dashboard.
 *
 * - Bila basis data memang tidak terkonfigurasi (pengembangan lokal
 *   tanpa basis data) atau saat build, daftar dikembalikan kosong —
 *   halaman menampilkan keadaan kosong yang jujur.
 * - Bila basis data terkonfigurasi tetapi gagal dibaca saat runtime,
 *   bacaannya dicoba ulang lewat `bacaDenganCobaUlang` lalu DILEMPAR
 *   sebagai galat. Alasannya: halaman-halaman pemakai daftar ini
 *   memakai ISR, jadi daftar kosong hasil satu kegagalan sesaat bisa
 *   tersimpan sebagai hitungan basi sampai satu jam. Dengan melempar,
 *   ISR mempertahankan versi baik terakhir dan kunjungan berikutnya
 *   mencoba lagi.
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
  return {
    recipes: managed,
    managedSlugs: managedRows.map((row) => row.slug),
  };
}

export const getPublicRecipeData = cache(async (): Promise<PublicRecipeData> => {
  // Tanpa basis data terkonfigurasi (pengembangan lokal), memang belum
  // ada resep apa pun untuk ditampilkan.
  if (!isDatabaseConfigured()) {
    return { recipes: [], managedSlugs: [] };
  }
  try {
    return await bacaDenganCobaUlang(bacaDariBasisData);
  } catch (error) {
    console.error("Gagal membaca daftar resep publik dari basis data:", error);
    // Saat build (prerender) jangan gagalkan build hanya karena
    // basis data tak terjangkau: daftar kosong dulu, halaman akan
    // menggambar ulang dengan data asli pada revalidasi pertama.
    if (sedangPrerenderBuild()) {
      return { recipes: [], managedSlugs: [] };
    }
    // Runtime: lempar agar render ini tidak disimpan ke cache ISR
    // sebagai daftar kosong yang basi (lihat catatan di kepala berkas).
    // Versi baik terakhir tetap disajikan dan halaman pulih sendiri
    // begitu basis data menjawab lagi.
    throw new Error("Basis data resep sedang tidak terjangkau. Coba lagi sesaat lagi.");
  }
});

/** Daftar resep publik dari basis data (hanya yang berstatus terbit). */
export async function getPublicRecipes(): Promise<Recipe[]> {
  return (await getPublicRecipeData()).recipes;
}

/** Jumlah resep publik yang dikaitkan dengan satu provinsi. */
export function countRecipesForProvince(publicRecipes: readonly Recipe[], provinceName: string): number {
  return publicRecipes.filter((recipe) => recipe.provinces.includes(provinceName)).length;
}
