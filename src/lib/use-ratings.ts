"use client";

import { useEffect, useState } from "react";
import { BAYESIAN_MIN_REVIEWS, globalReviewAverage } from "@/lib/rating-utils";
import type { RecipeRatingMap } from "@/lib/review-summary";

/**
 * Rating nyata dari ulasan pengunjung. Diambil sekali per muat halaman lalu
 * dipakai bersama oleh semua kartu resep, sehingga angka yang tampil selalu
 * berasal dari ulasan asli yang sudah disetujui (bukan angka katalog).
 *
 * Resep tanpa ulasan tidak muncul di peta ini; pemanggil menampilkan
 * "Belum ada rating" untuk kasus itu.
 */
export type RatingSummaryState = {
  ratings: RecipeRatingMap;
  /** Rata-rata seluruh ulasan (nilai `C` pada rumus Bayesian); 0 bila belum ada ulasan. */
  globalAverage: number;
  /** Ambang `m` yang dipakai untuk skor Bayesian. */
  minReviews: number;
};

const RINGKASAN_KOSONG: RatingSummaryState = { ratings: {}, globalAverage: 0, minReviews: BAYESIAN_MIN_REVIEWS };

let cache: RatingSummaryState | null = null;
let pending: Promise<RatingSummaryState> | null = null;

async function loadRatings(): Promise<RatingSummaryState> {
  if (cache) return cache;
  if (!pending) {
    pending = fetch("/api/public/reviews/summary", { cache: "no-store" })
      .then(async (response) => (response.ok ? (await response.json()) as { ratings?: RecipeRatingMap; global?: { count?: number; average?: number }; minReviews?: number } : {}))
      .then((body) => {
        const ratings = body.ratings ?? {};
        // Nilai `C` dari server dipakai apa adanya; bila tidak ada, dihitung dari
        // peta rating yang sama supaya rumusnya tetap satu.
        const terhitung = globalReviewAverage(ratings) ?? 0;
        const nilai = typeof body.global?.average === "number" && body.global.average > 0 ? body.global.average : terhitung;
        cache = { ratings, globalAverage: nilai, minReviews: body.minReviews ?? BAYESIAN_MIN_REVIEWS };
        return cache;
      })
      .catch(() => RINGKASAN_KOSONG)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/** Ringkasan lengkap (rating + rata-rata global + ambang) untuk pemeringkatan. */
export function useRatingSummary(): RatingSummaryState {
  const [ringkasan, setRingkasan] = useState<RatingSummaryState>(() => cache ?? RINGKASAN_KOSONG);
  useEffect(() => {
    if (cache) return;
    let active = true;
    void loadRatings().then((hasil) => {
      if (active) setRingkasan(hasil);
    });
    return () => {
      active = false;
    };
  }, []);
  return ringkasan;
}

export function useRecipeRatings(): RecipeRatingMap {
  return useRatingSummary().ratings;
}

/** Menghapus simpanan sementara — dipakai pengujian. */
export function resetRecipeRatingsCache() {
  cache = null;
  pending = null;
}
