import { provinceDirectory } from "@/data/province-directory";

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
export const provinces: Province[] = provinceDirectory.map((province) => ({
  ...province,
  // Diisi ulang dari daftar resep publik oleh halaman pemakai; data
  // contoh statis sudah dihapus sehingga tidak ada hitungan bawaan.
  recipeCount: 0,
}));
