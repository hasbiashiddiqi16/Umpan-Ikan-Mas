import "server-only";

import { and, count, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { cmsReviews } from "@/db/schema";
import { provinces } from "@/data/provinces";
import type { PopupStat } from "@/lib/appearance";
import { getPublicRecipeData } from "@/lib/public-recipes";

const formatAngka = (nilai: number) => new Intl.NumberFormat("id-ID").format(nilai);

/**
 * Statistik popup sambutan, selalu dihitung dari data asli situs: jumlah
 * resep yang terbit, ulasan komunitas yang sudah disetujui (bukan contoh),
 * dan jumlah provinsi. Dulu angka ini ditulis tangan di pengaturan dan
 * menyatu di gambar poster ("200 racikan, 5.000 ulasan") padahal tidak
 * sesuai keadaan — kini popup menampilkannya sebagai teks dari sini.
 *
 * Mengembalikan `null` hanya bila daftar resep tidak bisa dibaca sama
 * sekali; jumlah ulasan yang gagal dibaca dianggap 0 (klaim lebih kecil
 * daripada mengarang angka).
 */
export async function hitungStatistikSitus(): Promise<PopupStat[] | null> {
  let jumlahResep: number;
  try {
    jumlahResep = (await getPublicRecipeData()).recipes.length;
  } catch {
    return null;
  }
  let jumlahUlasan = 0;
  try {
    const [baris] = await db
      .select({ total: count() })
      .from(cmsReviews)
      .where(and(isNull(cmsReviews.seedKey), eq(cmsReviews.status, "approved"), lte(cmsReviews.createdAt, sql`now()`)));
    jumlahUlasan = Number(baris?.total ?? 0);
  } catch {
    jumlahUlasan = 0;
  }
  return [
    { value: formatAngka(jumlahResep), label: "racikan umpan" },
    { value: formatAngka(jumlahUlasan), label: "ulasan komunitas" },
    { value: formatAngka(provinces.length), label: "provinsi" },
  ];
}
