"use client";

import { useEffect, useState } from "react";
import type { RecipeRatingMap } from "@/lib/review-summary";

/**
 * Rating nyata dari ulasan pengunjung. Diambil sekali per muat halaman lalu
 * dipakai bersama oleh semua kartu resep, sehingga angka yang tampil selalu
 * berasal dari ulasan asli yang sudah disetujui (bukan angka katalog).
 *
 * Resep tanpa ulasan tidak muncul di peta ini; pemanggil menampilkan
 * "Belum ada rating" untuk kasus itu.
 */
let cache: RecipeRatingMap | null = null;
let pending: Promise<RecipeRatingMap> | null = null;

async function loadRatings(): Promise<RecipeRatingMap> {
  if (cache) return cache;
  if (!pending) {
    pending = fetch("/api/public/reviews/summary", { cache: "no-store" })
      .then(async (response) => (response.ok ? (await response.json()) as { ratings?: RecipeRatingMap } : { ratings: {} }))
      .then((body) => {
        cache = body.ratings ?? {};
        return cache;
      })
      .catch(() => ({}) as RecipeRatingMap)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function useRecipeRatings(): RecipeRatingMap {
  const [ratings, setRatings] = useState<RecipeRatingMap>(() => cache ?? {});
  useEffect(() => {
    if (cache) return;
    let active = true;
    void loadRatings().then((map) => {
      if (active) setRatings(map);
    });
    return () => {
      active = false;
    };
  }, []);
  return ratings;
}

/** Menghapus simpanan sementara — dipakai pengujian. */
export function resetRecipeRatingsCache() {
  cache = null;
  pending = null;
}
