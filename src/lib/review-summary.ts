import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { cmsReviews } from "@/db/schema";

import type { RecipeRating, RecipeRatingMap } from "@/lib/rating-utils";

export type { RecipeRating, RecipeRatingMap } from "@/lib/rating-utils";

export const EMPTY_RATING: RecipeRating = { count: 0, average: 0 };

/**
 * Rating publik sebuah resep — **hanya** dari ulasan asli pengunjung.
 *
 * Syaratnya: status sudah disetujui, bukan ulasan contoh (`seed_key` kosong),
 * dan tanggalnya tidak melewati waktu server. Ulasan contoh tidak pernah ikut
 * dihitung, karena itu data contoh — bukan bukti komunitas.
 */
export async function getRecipeRatings(): Promise<RecipeRatingMap> {
  try {
    const rows = await db
      .select({
        slug: cmsReviews.recipeSlug,
        total: sql<number>`count(*)::int`,
        average: sql<number>`coalesce(avg(${cmsReviews.rating}), 0)::float8`,
      })
      .from(cmsReviews)
      .where(and(eq(cmsReviews.status, "approved"), isNull(cmsReviews.seedKey), lte(cmsReviews.createdAt, sql`now()`)))
      .groupBy(cmsReviews.recipeSlug);
    return Object.fromEntries(
      rows.map((row) => [row.slug, { count: Number(row.total) || 0, average: Number(row.average) || 0 }]),
    );
  } catch {
    // Basis data belum tersambung: jangan mengarang angka, kembalikan kosong.
    return {};
  }
}
