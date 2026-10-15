"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Heart, Users } from "lucide-react";
import type { Recipe } from "@/data/recipes";
import { Badge, RecipeRating } from "@/components/shared";
import { MatchOrPopularBadge } from "@/components/match-or-popular";
import { fishingTypeTag, recipeBadge } from "@/lib/recipe-badge";
import { useRecipeRatings } from "@/lib/use-ratings";

const FAVORITES_KEY = "umpan-mas-favorites";
const cardMetaBadgeClass = "h-7 w-full min-w-0 max-w-full justify-start !px-2 !text-[11px] !text-left";

function getStoredFavorites(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function RecipeCard({ recipe, matchScore }: { recipe: Recipe; matchScore?: number }) {
  const [favorite, setFavorite] = useState(false);
  // Rating katalog (angka editorial) tidak pernah ditampilkan; hanya ulasan asli.
  const ratings = useRecipeRatings();
  const badge = recipeBadge(recipe);
  const tagJenis = fishingTypeTag(recipe);

  useEffect(() => {
    const syncFavorite = () => setFavorite(getStoredFavorites().includes(recipe.slug));
    syncFavorite();
    const update = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail;
      setFavorite(Array.isArray(detail) ? detail.includes(recipe.slug) : getStoredFavorites().includes(recipe.slug));
    };
    window.addEventListener("umpan:favorites-change", update);
    return () => window.removeEventListener("umpan:favorites-change", update);
  }, [recipe.slug]);

  function toggleFavorite() {
    const current = getStoredFavorites();
    const next = favorite ? current.filter((slug) => slug !== recipe.slug) : [...new Set([...current, recipe.slug])];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    setFavorite(!favorite);
    window.dispatchEvent(new CustomEvent("umpan:favorites-change", { detail: next }));
  }

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#e8ebe5] bg-white shadow-[0_7px_25px_rgba(41,55,43,.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(41,55,43,.12)]">
      <div className="relative h-[190px] shrink-0 overflow-hidden bg-[#e8e6d9] sm:h-[205px]">
        <Link href={`/resep/${recipe.slug}`} aria-label={`Lihat resep ${recipe.name}`} className="absolute inset-0 z-0">
          <Image src={recipe.image} alt={recipe.imageAlt} fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
          <span className="absolute inset-0 bg-gradient-to-t from-[#172b20]/60 via-transparent to-[#16241b]/5" />
        </Link>
        <div className="pointer-events-none absolute left-3.5 top-3.5 flex flex-wrap gap-2">
          {/* Badge & tag kondisi dibaca dari field yang sama (jenis pemancingan resep). */}
          <Badge tone={badge.tone} title={badge.title}>{badge.label}</Badge>
        </div>
        <button type="button" onClick={toggleFavorite} aria-label={favorite ? `Hapus ${recipe.name} dari favorit` : `Simpan ${recipe.name} ke favorit`} aria-pressed={favorite} className={`absolute right-3.5 top-3.5 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/55 shadow-sm backdrop-blur-md transition ${favorite ? "bg-[#fbf0e8] text-[#b65b42]" : "bg-white/90 text-[#536357] hover:bg-white"}`}>
          <Heart size={18} fill={favorite ? "currentColor" : "none"} />
        </button>
        <MatchOrPopularBadge recipe={recipe} matchScore={matchScore} />
        <div className="pointer-events-none absolute bottom-3.5 left-4 text-white"><p className="text-[11px] font-medium text-white/80">Racikan katalog</p><p className="text-xs font-bold">Ikan mas</p></div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/resep/${recipe.slug}`} className="line-clamp-1 text-[17px] font-extrabold tracking-tight text-[#223528] transition hover:text-[#55734d]">{recipe.name}</Link>
            <div className="mt-1.5 flex items-center gap-2"><RecipeRating rating={ratings[recipe.slug]} /></div>
          </div>
          <Link href={`/resep/${recipe.slug}`} aria-label={`Buka ${recipe.name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f1f4ef] text-[#4f694f] transition hover:bg-[#e5ede2]"><ArrowUpRight size={17} /></Link>
        </div>
        <div className="mt-4 grid flex-1 grid-cols-2 content-start gap-1.5 min-[440px]:grid-cols-3">
          <Badge className={cardMetaBadgeClass}><span className="truncate" title={recipe.weather[0]}>{recipe.weather[0] === "Hujan" ? "🌧️" : recipe.weather[0] === "Cerah" || recipe.weather[0] === "Panas" ? "☀️" : "☁️"} {recipe.weather[0]}</span></Badge>
          <Badge tone="cream" className={cardMetaBadgeClass}><span className="truncate" title={recipe.water[0]}>💧 {recipe.water[0]}</span></Badge>
          <Badge tone="cream" className={cardMetaBadgeClass}><span className="truncate" title={`Jenis pemancingan: ${tagJenis}`}>🎣 {tagJenis}</span></Badge>
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-[#edf0eb] pt-3.5">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#9aa098]">Estimasi biaya</p><p className="mt-0.5 text-sm font-extrabold text-[#26382b]">{recipe.price}</p></div>
          <div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#9aa098]">Kesulitan</p><p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-[#59675a]"><Users size={12} /> {recipe.difficulty}</p></div>
        </div>
        <Link href={`/resep/${recipe.slug}`} className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl border border-[#dce5da] text-sm font-bold text-[#31593a] transition hover:border-[#31593a] hover:bg-[#f2f6f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31593a]">Lihat Resep <ArrowUpRight size={15} className="ml-1" /></Link>
      </div>
    </article>
  );
}
