"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, SlidersHorizontal } from "lucide-react";
import { recipes, defaultPreferences } from "@/data/recipes";
import type { CmsRecipeRecord } from "@/lib/cms";
import { cmsRecipeToRecipe, mergeRecipesBySlug } from "@/lib/cms";
import { SearchInput, EmptyState } from "@/components/shared";
import { RecipeCard } from "@/components/recipe-card";
import { FilterBar, defaultCatalogFilters, type CatalogFilters } from "@/components/filter-bar";
import { calculateMatchScore, filterRecipesByBudget, getRecommendedRecipes } from "@/lib/recommendation";
import { searchRecipes } from "@/lib/search";

const categories = ["Semua", "Harian", "Lomba", "Galat", "Premium", "Ekonomis"];
const cityProvince: Record<string, string> = {
  Bogor: "Jawa Barat", Bandung: "Jawa Barat", Bekasi: "Jawa Barat", Depok: "Jawa Barat",
  Jakarta: "DKI Jakarta", Semarang: "Jawa Tengah", Yogyakarta: "DI Yogyakarta", Surabaya: "Jawa Timur",
  Palembang: "Sumatera Selatan", Denpasar: "Bali",
};
const FAVORITES_KEY = "umpan-mas-favorites";

function readFavorites(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

export function CatalogView() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<CatalogFilters>(defaultCatalogFilters);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [publishedRecipes, setPublishedRecipes] = useState<ReturnType<typeof cmsRecipeToRecipe>[]>([]);
  const [shadowedSlugs, setShadowedSlugs] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/public/recipes", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ recipes?: CmsRecipeRecord[]; shadowedSlugs?: string[] }> : { recipes: [], shadowedSlugs: [] })
      .then((body) => {
        setPublishedRecipes((body.recipes ?? []).map((record) => cmsRecipeToRecipe(record)));
        setShadowedSlugs(body.shadowedSlugs ?? []);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const syncFavorites = () => setFavoriteSlugs(readFavorites());
    syncFavorites();
    const applyInitialFilter = () => setFavoritesOnly(new URLSearchParams(window.location.search).get("favorites") === "1");
    window.setTimeout(applyInitialFilter, 0);
    const updateFavorites = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail;
      setFavoriteSlugs(Array.isArray(detail) ? detail : readFavorites());
    };
    window.addEventListener("umpan:favorites-change", updateFavorites);
    window.addEventListener("storage", updateFavorites);
    return () => {
      window.removeEventListener("umpan:favorites-change", updateFavorites);
      window.removeEventListener("storage", updateFavorites);
    };
  }, []);

  const filteredRecipes = useMemo(() => {
    const managedSlugs = new Set(shadowedSlugs);
    const visibleSeedRecipes = recipes.filter((recipe) => !managedSlugs.has(recipe.slug));
    const allRecipes = mergeRecipesBySlug(visibleSeedRecipes, publishedRecipes);
    let result = searchRecipes(allRecipes, query);
    if (filters.category !== "Semua") result = result.filter((recipe) => recipe.category === filters.category);
    if (filters.province !== "Semua provinsi") result = result.filter((recipe) => recipe.provinces.includes(filters.province));
    if (filters.city !== "Semua kota") result = result.filter((recipe) => recipe.provinces.includes(cityProvince[filters.city] ?? ""));
    if (filters.weather !== "Semua cuaca") result = result.filter((recipe) => recipe.weather.includes(filters.weather as (typeof recipe.weather)[number]));
    if (filters.season !== "Semua musim") result = result.filter((recipe) => recipe.seasons.includes(filters.season));
    if (filters.water !== "Semua kondisi air") result = result.filter((recipe) => recipe.water.includes(filters.water as (typeof recipe.water)[number]));
    if (filters.fishingType !== "Semua jenis") result = result.filter((recipe) => recipe.fishingTypes.includes(filters.fishingType as (typeof recipe.fishingTypes)[number]));
    if (filters.budget !== "Semua budget") result = filterRecipesByBudget(result, filters.budget);
    if (filters.difficulty !== "Semua tingkat") result = result.filter((recipe) => recipe.difficulty === filters.difficulty);
    if (favoritesOnly) result = result.filter((recipe) => favoriteSlugs.includes(recipe.slug));

    if (filters.sort === "Rating Tertinggi") return [...result].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    if (filters.sort === "Terpopuler") return [...result].sort((a, b) => b.users - a.users);
    if (filters.sort === "Terbaru") return [...result].reverse();
    if (filters.sort === "Harga Terendah") return [...result].sort((a, b) => a.priceValue - b.priceValue);
    return getRecommendedRecipes(result, {
      ...defaultPreferences,
      province: filters.province === "Semua provinsi" ? defaultPreferences.province : filters.province,
      weather: filters.weather === "Semua cuaca" ? defaultPreferences.weather : filters.weather,
      water: filters.water === "Semua kondisi air" ? defaultPreferences.water : filters.water,
      fishingType: filters.fishingType === "Semua jenis" ? defaultPreferences.fishingType : filters.fishingType,
      season: filters.season === "Semua musim" ? defaultPreferences.season : filters.season,
    });
  }, [query, filters, favoritesOnly, favoriteSlugs, publishedRecipes, shadowedSlugs]);

  function selectCategory(category: string) {
    setFilters((current) => ({ ...current, category }));
  }

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div><p className="mb-3 text-xs font-bold uppercase tracking-[.17em] text-[#758676]">Cari racikan yang pas</p><h1 className="text-4xl font-black tracking-[-.045em] text-[#1f3225] sm:text-5xl">Katalog Umpan</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#758075] sm:text-base">Temukan racikan berdasarkan kebutuhan dan kondisi mancing. Pilih dari pengalaman pemancing di berbagai daerah.</p></div>
        <Link href="/ai-umpan" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full bg-[#e8eee5] px-5 text-sm font-bold text-[#35553a] transition hover:bg-[#dce8d9] lg:self-auto">Bingung pilih? Tanya AI <ArrowRight size={15} /></Link>
      </div>
      <div className="space-y-4 rounded-[25px] border border-[#e7ebe5] bg-white p-4 shadow-[0_8px_28px_rgba(39,56,41,.04)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row"><SearchInput value={query} onChange={setQuery} className="flex-1" /><button type="button" onClick={() => setFavoritesOnly((value) => !value)} aria-pressed={favoritesOnly} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${favoritesOnly ? "border-[#e8cfbf] bg-[#fcf2ec] text-[#a35b3e]" : "border-[#e5e9e2] bg-white text-[#59685a] hover:bg-[#f7f9f5]"}`}><Heart size={16} fill={favoritesOnly ? "currentColor" : "none"} />{favoritesOnly ? "Menampilkan favorit" : "Lihat favorit"}</button></div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Kategori resep">{categories.map((category) => <button type="button" key={category} onClick={() => selectCategory(category)} aria-pressed={filters.category === category} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold transition ${filters.category === category ? "bg-[#294b34] text-white shadow-sm" : "bg-[#f3f5f1] text-[#657165] hover:bg-[#e8eee5]"}`}>{category}</button>)}</div>
      </div>
      <div className="mt-4"><FilterBar filters={filters} onChange={setFilters} resultCount={filteredRecipes.length} /></div>
      <div className="mb-5 mt-7 flex items-center justify-between gap-4"><div><p className="text-sm font-extrabold text-[#344538]">{filteredRecipes.length} racikan ditemukan</p><p className="mt-1 text-xs text-[#8b9389]">Disusun berdasarkan kecocokan dan masukan komunitas</p></div><span className="hidden items-center gap-1.5 text-xs text-[#91998f] sm:inline-flex"><SlidersHorizontal size={13} /> Hasil diperbarui langsung</span></div>
      {filteredRecipes.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filteredRecipes.map((recipe, index) => <RecipeCard key={recipe.slug} recipe={recipe} matchScore={calculateMatchScore(recipe, { ...defaultPreferences, province: filters.province === "Semua provinsi" ? defaultPreferences.province : filters.province, weather: filters.weather === "Semua cuaca" ? defaultPreferences.weather : filters.weather, water: filters.water === "Semua kondisi air" ? defaultPreferences.water : filters.water, fishingType: filters.fishingType === "Semua jenis" ? defaultPreferences.fishingType : filters.fishingType, season: filters.season === "Semua musim" ? defaultPreferences.season : filters.season })} featured={index === 0} />)}</div> : <EmptyState title={query ? "Umpan tidak ditemukan." : favoritesOnly ? "Belum ada resep favorit." : "Belum ada resep yang sesuai."} description={favoritesOnly ? "Simpan resep dengan mengetuk ikon hati. Favorit tersimpan di perangkat ini." : query ? "Coba kata kunci lain seperti ‘kroto’, ‘pelet’, atau ‘umpan putih’." : "Coba ubah filter provinsi, kondisi air, atau budget untuk melihat racikan lainnya."} />}
    </div>
  );
}
