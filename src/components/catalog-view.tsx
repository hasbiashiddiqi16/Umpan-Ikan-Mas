"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, SlidersHorizontal } from "lucide-react";
import { FISHING_TYPES, defaultPreferences, normalizeFishingType, recipes } from "@/data/recipes";
import type { CmsRecipeRecord } from "@/lib/cms";
import { cmsRecipeToRecipe, mergeRecipesBySlug } from "@/lib/cms";
import { SearchInput, EmptyState } from "@/components/shared";
import { RecipeCard } from "@/components/recipe-card";
import { FilterBar, defaultCatalogFilters, type CatalogFilters } from "@/components/filter-bar";
import { UseMyLocationButton } from "@/components/location-controls";
import { isCatalogCity, provinceForCatalogCity } from "@/data/geo-cities";
import { calculateMatchScore, filterRecipesByBudget, getRecommendedRecipes } from "@/lib/recommendation";
import { searchRecipes } from "@/lib/search";
import { useLocationAutofill } from "@/lib/use-location";
import { useRatingSummary } from "@/lib/use-ratings";
import { BAYESIAN_HINT, ratingScoreRanker } from "@/lib/rating-utils";
import { saveVisitorPreferences } from "@/lib/visitor-preferences";
import type { DetectedPlace } from "@/lib/location";

// Pilihan cepat memakai daftar jenis pemancingan yang sama dengan data resep,
// jadi tidak ada lagi kategori "Premium"/"Ekonomis" yang tidak dipakai badge.
const categories = ["Semua", ...FISHING_TYPES];
const FAVORITES_KEY = "umpan-mas-favorites";

function readFavorites(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

export function CatalogView() {
  // Rating dari ulasan asli; dipakai untuk urutan dan label kartu.
  const { ratings, globalAverage, minReviews } = useRatingSummary();
  // Urutan "Rating Tertinggi" memakai rata-rata Bayesian (m = minReviews):
  // resep dengan sedikit ulasan tidak menyalip resep yang diulas jauh lebih banyak.
  const rankerRating = useMemo(() => ratingScoreRanker(ratings, globalAverage, minReviews), [ratings, globalAverage, minReviews]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<CatalogFilters>(defaultCatalogFilters);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const filterAktif = filters.province !== "Semua provinsi" || filters.city !== "Semua kota" || filters.weather !== "Semua cuaca" || filters.season !== "Semua musim" || filters.water !== "Semua kondisi air" || filters.waterBody !== "Semua tipe air" || filters.fishingType !== "Semua jenis" || filters.budget !== "Semua budget" || filters.difficulty !== "Semua tingkat" || Boolean(query);

  function applyLocationToFilters(place: DetectedPlace) {
    saveVisitorPreferences({ province: place.province });
    setFilters((current) => ({
      ...current,
      province: place.province,
      // Kota hanya dipakai bila tersedia sebagai pilihan filter.
      city: isCatalogCity(place.city) ? (place.city as string) : current.city,
    }));
  }

  function resetLocationFilters() {
    setFilters((current) => ({ ...current, province: "Semua provinsi", city: "Semua kota" }));
  }

  const { consent: locationConsent, place: locationPlace, markTouched } = useLocationAutofill(applyLocationToFilters);
  const locationFilterActive = Boolean(locationConsent === "granted" && locationPlace && filters.province === locationPlace.province);
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
    if (filters.category !== "Semua") {
      const dipilihCepat = normalizeFishingType(filters.category);
      result = result.filter((recipe) => recipe.fishingTypes.map(normalizeFishingType).includes(dipilihCepat));
    }
    if (filters.province !== "Semua provinsi") result = result.filter((recipe) => recipe.provinces.includes(filters.province));
    if (filters.city !== "Semua kota") result = result.filter((recipe) => recipe.provinces.includes(provinceForCatalogCity(filters.city) ?? ""));
    if (filters.weather !== "Semua cuaca") result = result.filter((recipe) => recipe.weather.includes(filters.weather as (typeof recipe.weather)[number]));
    if (filters.season !== "Semua musim") result = result.filter((recipe) => recipe.seasons.includes(filters.season));
    if (filters.water !== "Semua kondisi air") result = result.filter((recipe) => recipe.water.includes(filters.water as (typeof recipe.water)[number]));
    if (filters.waterBody !== "Semua tipe air") result = result.filter((recipe) => recipe.waterBodies.includes(filters.waterBody as (typeof recipe.waterBodies)[number]));
    if (filters.fishingType !== "Semua jenis") {
      const dipilih = normalizeFishingType(filters.fishingType);
      result = result.filter((recipe) => recipe.fishingTypes.map(normalizeFishingType).includes(dipilih));
    }
    if (filters.budget !== "Semua budget") result = filterRecipesByBudget(result, filters.budget);
    if (filters.difficulty !== "Semua tingkat") result = result.filter((recipe) => recipe.difficulty === filters.difficulty);
    if (favoritesOnly) result = result.filter((recipe) => favoriteSlugs.includes(recipe.slug));

    // Urutan "Rating Tertinggi" memakai rata-rata Bayesian dari rating ulasan
    // asli (lihat BAYESIAN_HINT). Resep tanpa ulasan tidak dikarang angkanya dan
    // selalu berada di bawah resep yang sudah diulas. Urutan lain tetap
    // berbasis jumlah ulasan, jadi tidak ikut berubah.
    if (filters.sort === "Rating Tertinggi") return [...result].sort(rankerRating);
    if (filters.sort === "Ulasan Terbanyak") return [...result].sort((a, b) => (ratings[b.slug]?.count ?? 0) - (ratings[a.slug]?.count ?? 0));
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
  }, [query, filters, favoritesOnly, favoriteSlugs, publishedRecipes, shadowedSlugs, ratings, rankerRating]);

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
        <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Jenis pemancingan">{categories.map((category) => <button type="button" key={category} onClick={() => selectCategory(category)} aria-pressed={filters.category === category} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold transition ${filters.category === category ? "bg-[#294b34] text-white shadow-sm" : "bg-[#f3f5f1] text-[#657165] hover:bg-[#e8eee5]"}`}>{category}</button>)}</div>
      </div>
      <div className="mt-4">
        <FilterBar
          filters={filters}
          onChange={(next) => {
            markTouched();
            setFilters(next);
            // Filter yang dipilih pengunjung disimpan sebagai kondisinya, supaya
            // skor kecocokan di halaman lain juga punya dasar yang jelas.
            saveVisitorPreferences({
              province: next.province !== "Semua provinsi" ? next.province : undefined,
              weather: next.weather !== "Semua cuaca" ? next.weather : undefined,
              water: next.water !== "Semua kondisi air" ? next.water : undefined,
              waterBody: next.waterBody !== "Semua tipe air" ? next.waterBody : undefined,
              fishingType: next.fishingType !== "Semua jenis" ? next.fishingType : undefined,
              season: next.season !== "Semua musim" ? next.season : undefined,
            });
          }}
          resultCount={filteredRecipes.length}
          locationControl={
            <div className="flex flex-wrap items-center gap-2">
              <UseMyLocationButton onPlace={applyLocationToFilters} onForget={resetLocationFilters} label="Saring dari lokasi saya" />
              {locationFilterActive && (
                <>
                  <span className="text-[11px] font-semibold text-[#7e897c]">Filter provinsi mengikuti lokasi terdeteksi.</span>
                  <button type="button" onClick={() => { markTouched(); resetLocationFilters(); }} className="min-h-8 rounded-lg px-2.5 text-[11px] font-bold text-[#4f6b4f] underline-offset-2 transition hover:bg-[#eef3eb] hover:underline">
                    Tampilkan semua daerah
                  </button>
                </>
              )}
            </div>
          }
        />
      </div>
      <div className="mb-5 mt-7 flex items-center justify-between gap-4"><div><p className="text-sm font-extrabold text-[#344538]">{filteredRecipes.length} racikan ditemukan</p><p className="mt-1 text-xs text-[#8b9389]">{filters.sort === "Rating Tertinggi" ? "Diurutkan dari skor rating ulasan pengunjung (rata-rata Bayesian)" : "Disusun berdasarkan kecocokan dan masukan komunitas"}</p></div><span className="hidden items-center gap-1.5 text-xs text-[#91998f] sm:inline-flex"><SlidersHorizontal size={13} /> Hasil diperbarui langsung</span></div>
      {filters.sort === "Rating Tertinggi" && <p className="mb-5 -mt-2 rounded-xl bg-[#f6f8f4] px-3.5 py-2.5 text-[11px] leading-5 text-[#7a8479]">{BAYESIAN_HINT}</p>}
      {filteredRecipes.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filteredRecipes.map((recipe, index) => <RecipeCard key={recipe.slug} recipe={recipe} matchScore={filterAktif ? calculateMatchScore(recipe, { ...defaultPreferences, province: filters.province === "Semua provinsi" ? defaultPreferences.province : filters.province, weather: filters.weather === "Semua cuaca" ? defaultPreferences.weather : filters.weather, water: filters.water === "Semua kondisi air" ? defaultPreferences.water : filters.water, waterBody: filters.waterBody === "Semua tipe air" ? undefined : filters.waterBody, fishingType: filters.fishingType === "Semua jenis" ? defaultPreferences.fishingType : filters.fishingType, season: filters.season === "Semua musim" ? defaultPreferences.season : filters.season }) : undefined} />)}</div> : <EmptyState title={query ? "Umpan tidak ditemukan." : favoritesOnly ? "Belum ada resep favorit." : "Belum ada resep yang sesuai."} description={favoritesOnly ? "Simpan resep dengan mengetuk ikon hati. Favorit tersimpan di perangkat ini." : query ? "Coba kata kunci lain seperti ‘kroto’, ‘pelet’, atau ‘umpan putih’." : "Coba ubah filter provinsi, kondisi air, atau budget untuk melihat racikan lainnya."} />}
    </div>
  );
}
