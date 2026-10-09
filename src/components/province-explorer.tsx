"use client";

import { useMemo, useState } from "react";
import type { Recipe } from "@/data/recipes";
import { RecipeCard } from "@/components/recipe-card";
import { EmptyState, SectionHeader } from "@/components/shared";
import { filterRecipesByBudget } from "@/lib/recommendation";

const selectClass = "min-h-11 rounded-xl border border-[#e3e8e1] bg-white px-3 text-sm font-medium text-[#3b493e] outline-none focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";

export function ProvinceExplorer({ province, recipes }: { province: string; recipes: Recipe[] }) {
  const [weather, setWeather] = useState("Semua cuaca");
  const [water, setWater] = useState("Semua kondisi air");
  const [fishingType, setFishingType] = useState("Semua kolam");
  const [budget, setBudget] = useState("Semua budget");
  const results = useMemo(() => {
    let filtered = recipes;
    if (weather !== "Semua cuaca") filtered = filtered.filter((recipe) => recipe.weather.includes(weather as (typeof recipe.weather)[number]));
    if (water !== "Semua kondisi air") filtered = filtered.filter((recipe) => recipe.water.includes(water as (typeof recipe.water)[number]));
    if (fishingType !== "Semua kolam") filtered = filtered.filter((recipe) => recipe.fishingTypes.includes(fishingType as (typeof recipe.fishingTypes)[number]));
    if (budget !== "Semua budget") filtered = filterRecipesByBudget(filtered, budget);
    return filtered;
  }, [recipes, weather, water, fishingType, budget]);
  return (
    <section className="mt-10"><SectionHeader eyebrow="Dari katalog UMPAN MAS" title={`Racikan populer di ${province}`} subtitle="Sampel resep yang dikaitkan dengan daerah ini. Sesuaikan lagi dengan kondisi kolam tempatmu memancing." />
      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-[#e7ebe5] bg-[#f8faf7] p-3.5">
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[.09em] text-[#899286]">Cuaca<select className={selectClass} value={weather} onChange={(event) => setWeather(event.target.value)}>{["Semua cuaca", "Hujan", "Mendung", "Cerah", "Berawan", "Panas"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[.09em] text-[#899286]">Kondisi air<select className={selectClass} value={water} onChange={(event) => setWater(event.target.value)}>{["Semua kondisi air", "Keruh", "Hijau", "Jernih", "Kekuningan"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[.09em] text-[#899286]">Jenis kolam<select className={selectClass} value={fishingType} onChange={(event) => setFishingType(event.target.value)}>{["Semua kolam", "Harian", "Lomba", "Galat"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[.09em] text-[#899286]">Budget<select className={selectClass} value={budget} onChange={(event) => setBudget(event.target.value)}>{["Semua budget", "< Rp15.000", "Rp15.000–30.000", "Rp30.000–50.000", "> Rp50.000"].map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <p className="mb-4 text-sm font-bold text-[#526253]">{results.length} racikan ditemukan</p>
      {results.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.map((recipe, index) => <RecipeCard key={recipe.slug} recipe={recipe} featured={index === 0} />)}</div> : <EmptyState title="Belum ada racikan yang sesuai." description="Coba longgarkan pilihan cuaca, kondisi air, atau budget." />}
    </section>
  );
}
