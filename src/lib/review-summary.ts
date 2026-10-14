import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { cmsReviews } from "@/db/schema";

import { BAYESIAN_MIN_REVIEWS, globalReviewAverage } from "@/lib/rating-utils";
import type { RecipeRating, RecipeRatingMap } from "@/lib/rating-utils";

export type { RecipeRating, RecipeRatingMap } from "@/lib/rating-utils";

export const EMPTY_RATING: RecipeRating = { count: 0, average: 0 };

/**
 * Ringkasan rating untuk pemeringkatan.
 *
 * `global.average` adalah nilai `C` pada rumus rata-rata Bayesian: rata-rata
 * seluruh ulasan yang sudah disetujui (setiap ulasan dihitung sekali). Angka ini
 * dikirim bersama peta rating supaya server, katalog, dan halaman lain memakai
 * nilai yang sama persis, bukan menghitung ulang sendiri-sendiri.
 */
export type RatingSummary = {
  ratings: RecipeRatingMap;
  global: { count: number; average: number };
  /** Ambang `m` yang dipakai untuk skor Bayesian. */
  minReviews: number;
};

/**
 * Rating publik sebuah resep — **hanya** dari ulasan asli pengunjung.
 *
 * Syaratnya: status sudah disetujui, bukan ulasan contoh (`seed_key` kosong),
 * dan tanggalnya tidak melewati waktu server. Ulasan contoh tidak pernah ikut
 * dihitung, karena itu data contoh — bukan bukti komunitas.
 */
export async function getRatingSummary(): Promise<RatingSummary> {
  const ratings = await getRecipeRatings();
  const average = globalReviewAverage(ratings);
  const count = Object.values(ratings).reduce((total, rating) => total + (rating?.count ?? 0), 0);
  return {
    ratings,
    global: { count, average: average ?? 0 },
    minReviews: BAYESIAN_MIN_REVIEWS,
  };
}

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
