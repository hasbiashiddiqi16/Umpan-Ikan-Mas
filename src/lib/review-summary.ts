import { cache } from "react";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { bacaDenganCobaUlang, sedangPrerenderBuild } from "@/lib/db-retry";
import { cmsReviews } from "@/db/schema";
import { normalizeFishingType } from "@/data/recipes";
import type { RecipeReview } from "@/data/reviews";

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
 * Syaratnya: status sudah disetujui dan tanggalnya tidak melewati waktu server.
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

/**
 * Dibungkus `cache()` React: beberapa pulau `Suspense` dalam satu halaman
 * (mis. beranda) boleh memanggil ini bersamaan tanpa menggandakan query —
 * dalam satu render server hasilnya dipakai ulang.
 */
async function bacaRatingDariBasisData(): Promise<RecipeRatingMap> {
  const rows = await db
    .select({
      slug: cmsReviews.recipeSlug,
      total: sql<number>`count(*)::int`,
      average: sql<number>`coalesce(avg(${cmsReviews.rating}), 0)::float8`,
    })
    .from(cmsReviews)
    .where(and(eq(cmsReviews.status, "approved"), lte(cmsReviews.createdAt, sql`now()`)))
    .groupBy(cmsReviews.recipeSlug);
  return Object.fromEntries(
    rows.map((row) => [row.slug, { count: Number(row.total) || 0, average: Number(row.average) || 0 }]),
  );
}

/**
 * Ulasan pengunjung asli terbaru untuk permukaan komunitas (mis. seksi
 * Cerita Pemancing di beranda). Syaratnya sama dengan rating: sudah
 * disetujui dan tanggalnya tidak melewati waktu server. Hasilnya dibentuk sebagai `RecipeReview`
 * supaya bisa langsung ditampilkan kartu ulasan yang sama dengan
 * halaman resep.
 */
async function bacaUlasanTerbaruDariBasisData(limit: number): Promise<RecipeReview[]> {
  const rows = await db
    .select()
    .from(cmsReviews)
    .where(and(eq(cmsReviews.status, "approved"), lte(cmsReviews.createdAt, sql`now()`)))
    .orderBy(desc(cmsReviews.createdAt))
    .limit(limit);
  return rows.map((review) => ({
    id: review.id,
    name: review.name,
    location: review.location,
    recipeSlug: review.recipeSlug,
    rating: review.rating,
    weather: review.weather,
    water: review.water,
    waterBody: review.waterBody ?? undefined,
    // Ulasan lama bisa tersimpan dengan sebutan "Galat"; dibaca sebagai "Galatama".
    fishingType: normalizeFishingType(review.fishingType),
    catchCount: review.catchCount ?? undefined,
    sessionMinutes: review.sessionMinutes ?? undefined,
    rodCount: review.rodCount ?? undefined,
    date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(review.createdAt),
    comment: review.comment,
  }));
}

export const getLatestCommunityReviews = cache(async (limit = 3): Promise<RecipeReview[]> => {
  // Tanpa basis data terkonfigurasi (pengembangan lokal), memang
  // belum ada ulasan komunitas untuk ditampilkan.
  if (!isDatabaseConfigured()) return [];
  try {
    return await bacaDenganCobaUlang(() => bacaUlasanTerbaruDariBasisData(limit));
  } catch (error) {
    console.error("Gagal membaca ulasan komunitas terbaru dari basis data:", error);
    // Pola yang sama seperti rating: saat build kegagalan tidak
    // menggagalkan build, tetapi saat runtime galat dilempar agar
    // ISR tidak menyimpan daftar kosong hasil kegagalan sesaat.
    if (sedangPrerenderBuild()) return [];
    throw new Error("Basis data ulasan sedang tidak terjangkau. Coba lagi sesaat lagi.");
  }
});

export const getRecipeRatings = cache(async (): Promise<RecipeRatingMap> => {
  // Tanpa basis data terkonfigurasi (pengembangan lokal), memang
  // belum ada ulasan yang bisa dihitung — jangan mengarang angka.
  if (!isDatabaseConfigured()) return {};
  try {
    return await bacaDenganCobaUlang(bacaRatingDariBasisData);
  } catch (error) {
    console.error("Gagal membaca rating resep dari basis data:", error);
    // Saat build (prerender) kegagalan tidak boleh menggagalkan
    // build; halaman menggambar ulang dengan rating asli pada
    // revalidasi pertama.
    if (sedangPrerenderBuild()) return {};
    // Runtime: JANGAN kembalikan peta kosong. Halaman pemakai
    // (beranda, cuaca, provinsi) memakai ISR, jadi peta kosong hasil
    // satu kegagalan sesaat akan tersimpan sebagai urutan "belum ada
    // ulasan" sampai satu jam. Melempar membuat gambar ulang gagal
    // tanpa menyimpan apa pun — pola yang sama seperti daftar resep
    // publik di `public-recipes.ts`.
    throw new Error("Basis data ulasan sedang tidak terjangkau. Coba lagi sesaat lagi.");
  }
});
