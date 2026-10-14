"use client";

import { Flame } from "lucide-react";
import type { Recipe } from "@/data/recipes";
import { calculateMatchScore } from "@/lib/recommendation";
import { POPULAR_HINT, describeRating, describePreferences, isPopularRecipe } from "@/lib/rating-utils";
import { useRecipeRatings } from "@/lib/use-ratings";
import { useVisitorPreferences } from "@/lib/visitor-preferences";

const kotakClass = "rounded-xl border border-[#e1e8dd] bg-[#f4f8f1] p-4";
const kotakPopulerClass = "rounded-xl border border-[#eadfc2] bg-[#fbf7ec] p-4";

/** Skor kecocokan hanya dihitung kalau pengunjung sudah mengisi sesuatu. */
export function useVisitorMatchScore(recipe: Recipe) {
  const preferences = useVisitorPreferences();
  const sudahMengisi = Object.keys(preferences).length > 0;
  const score = sudahMengisi ? calculateMatchScore(recipe, preferences) : null;
  return { score, preferences, sudahMengisi };
}

/**
 * Kotak penjelas di halaman resep.
 *
 * - Pengunjung sudah mengisi kondisi → persentase kecocokan **beserta asalnya**.
 * - Belum mengisi → label "Populer" (dari jumlah ulasan nyata) atau tidak
 *   menampilkan apa pun. Tidak ada persentase yang muncul entah dari mana.
 */
export function MatchOrPopularBox({ recipe }: { recipe: Recipe }) {
  const { score, preferences } = useVisitorMatchScore(recipe);
  const ratings = useRecipeRatings();
  const rating = ratings[recipe.slug];
  const ringkasan = describePreferences(preferences);
  const populer = isPopularRecipe(ratings, recipe.slug);

  if (score !== null) {
    return (
      <div className={kotakClass}>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-[#31593a]">{score}%</span>
          <div>
            <p className="text-xs font-bold text-[#415342]">Kecocokan dengan pilihanmu</p>
            <p className="text-[10px] leading-4 text-[#8b9489]">{ringkasan || "Kondisi pilihanmu"}</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-[#8b9489]">Dihitung dari kondisi yang kamu isi (air, cuaca, jenis pemancingan, provinsi, musim) — bukan dari data katalog.</p>
      </div>
    );
  }

  if (populer) {
    return (
      <div className={kotakPopulerClass}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#c2842f]"><Flame size={19} /></span>
          <div>
            <p className="text-xs font-bold text-[#6b5a33]">Populer</p>
            <p className="text-[10px] leading-4 text-[#8b7d59]">{POPULAR_HINT}</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-[#8b7d59]">{describeRating(rating)}</p>
      </div>
    );
  }

  return null;
}

/**
 * Lencana di atas gambar kartu resep.
 * Skor match (kalau ada isian) atau label "Populer" (dari ulasan nyata) —
 * kalau keduanya tidak berlaku, tidak ada lencana sama sekali.
 */
export function MatchOrPopularBadge({ recipe, matchScore }: { recipe: Recipe; matchScore?: number }) {
  const { score } = useVisitorMatchScore(recipe);
  const ratings = useRecipeRatings();
  const efektif = matchScore ?? score;

  if (efektif !== null && efektif !== undefined) {
    return (
      <div className="absolute bottom-3.5 right-3.5 rounded-xl border border-white/25 bg-[#17372a]/85 px-3 py-2 text-white shadow-sm backdrop-blur-md" title="Kecocokan dengan kondisi yang kamu isi">
        <p className="text-[9px] font-bold uppercase tracking-[.13em] text-white/70">Match</p>
        <p className="text-lg font-black leading-none">{efektif}%</p>
      </div>
    );
  }

  if (isPopularRecipe(ratings, recipe.slug)) {
    return (
      <div className="absolute bottom-3.5 right-3.5 inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-[#8a5a1f]/85 px-3 py-2 text-white shadow-sm backdrop-blur-md" title={POPULAR_HINT}>
        <Flame size={14} aria-hidden="true" />
        <span className="text-[11px] font-bold">Populer</span>
      </div>
    );
  }

  return null;
}

/**
 * Lencana kecil di kepala halaman resep.
 * Sama aturannya: skor hanya kalau pengunjung sudah mengisi, kalau tidak label
 * "Populer" dari jumlah ulasan nyata, dan kalau keduanya tidak berlaku → tidak ada.
 */
export function MatchOrPopularChip({ recipe }: { recipe: Recipe }) {
  const { score } = useVisitorMatchScore(recipe);
  const ratings = useRecipeRatings();
  if (score !== null) {
    return (
      <span className="rounded-full bg-[#eaf2e8] px-3 py-1.5 text-xs font-bold text-[#416245]" title="Kecocokan dengan kondisi yang kamu isi">
        Match {score}% dengan pilihanmu
      </span>
    );
  }
  if (isPopularRecipe(ratings, recipe.slug)) {
    return (
      <span className="rounded-full bg-[#f6efdb] px-3 py-1.5 text-xs font-bold text-[#876822]" title={POPULAR_HINT}>
        🔥 Populer
      </span>
    );
  }
  return null;
}
