"use client";

import { useState } from "react";
import { Filter, SlidersHorizontal, X } from "lucide-react";
import { provinces } from "@/data/provinces";

export type CatalogFilters = {
  category: string;
  province: string;
  city: string;
  weather: string;
  season: string;
  water: string;
  fishingType: string;
  budget: string;
  difficulty: string;
  sort: string;
};

export const defaultCatalogFilters: CatalogFilters = {
  category: "Semua",
  province: "Semua provinsi",
  city: "Semua kota",
  weather: "Semua cuaca",
  season: "Semua musim",
  water: "Semua kondisi air",
  fishingType: "Semua jenis",
  budget: "Semua budget",
  difficulty: "Semua tingkat",
  sort: "Rekomendasi",
};

const selectClass = "min-h-11 w-full rounded-xl border border-[#e4e8e1] bg-white px-3 text-sm text-[#3b493e] outline-none focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";

export function FilterBar({ filters, onChange, resultCount }: { filters: CatalogFilters; onChange: (filters: CatalogFilters) => void; resultCount: number }) {
  const [open, setOpen] = useState(false);
  const update = (key: keyof CatalogFilters, value: string) => onChange({ ...filters, [key]: value });
  const controls = (
    <>
      <label className="grid gap-1.5 text-[11px] font-bold text-[#7e897c]">Provinsi<select className={selectClass} value={filters.province} onChange={(event) => update("province", event.target.value)}><option>Semua provinsi</option>{provinces.map((province) => <option key={province.slug}>{province.name}</option>)}</select></label>
      <label className="grid gap-1.5 text-[11px] font-bold text-[#7e897c]">Kota<select className={selectClass} value={filters.city} onChange={(event) => update("city", event.target.value)}>{["Semua kota", "Bogor", "Bandung", "Bekasi", "Depok", "Jakarta", "Semarang", "Yogyakarta", "Surabaya", "Palembang", "Denpasar"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="grid gap-1.5 text-[11px] font-bold text-[#7e897c]">Cuaca<select className={selectClass} value={filters.weather} onChange={(event) => update("weather", event.target.value)}>{["Semua cuaca", "Hujan", "Mendung", "Cerah", "Berawan", "Panas"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="grid gap-1.5 text-[11px] font-bold text-[#7e897c]">Musim<select className={selectClass} value={filters.season} onChange={(event) => update("season", event.target.value)}>{["Semua musim", "Musim Hujan", "Musim Panas", "Kemarau", "Peralihan"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="grid gap-1.5 text-[11px] font-bold text-[#7e897c]">Kondisi air<select className={selectClass} value={filters.water} onChange={(event) => update("water", event.target.value)}>{["Semua kondisi air", "Keruh", "Hijau", "Jernih", "Kekuningan"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="grid gap-1.5 text-[11px] font-bold text-[#7e897c]">Jenis kolam<select className={selectClass} value={filters.fishingType} onChange={(event) => update("fishingType", event.target.value)}>{["Semua jenis", "Harian", "Lomba", "Galat"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="grid gap-1.5 text-[11px] font-bold text-[#7e897c]">Budget<select className={selectClass} value={filters.budget} onChange={(event) => update("budget", event.target.value)}>{["Semua budget", "< Rp15.000", "Rp15.000–30.000", "Rp30.000–50.000", "> Rp50.000"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="grid gap-1.5 text-[11px] font-bold text-[#7e897c]">Kesulitan<select className={selectClass} value={filters.difficulty} onChange={(event) => update("difficulty", event.target.value)}>{["Semua tingkat", "Mudah", "Menengah", "Tingkat lanjut"].map((item) => <option key={item}>{item}</option>)}</select></label>
    </>
  );
  return (
    <div className="rounded-2xl border border-[#e7ebe5] bg-[#f8faf7] p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="inline-flex items-center gap-2 text-sm font-bold text-[#3f5041]"><SlidersHorizontal size={17} /> Saring racikan <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#849083]">{resultCount}</span></div><div className="flex items-center gap-2"><label className="hidden items-center gap-2 text-xs font-semibold text-[#828b81] sm:flex">Urutkan<select className="min-h-10 rounded-lg border border-[#e4e8e1] bg-white px-3 text-sm font-semibold text-[#3b493e] outline-none focus:border-[#748f70]" value={filters.sort} onChange={(event) => update("sort", event.target.value)}>{["Rekomendasi", "Rating Tertinggi", "Terpopuler", "Terbaru", "Harga Terendah"].map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#294b34] px-4 text-sm font-bold text-white md:hidden"><Filter size={15} /> Filter</button></div></div>
      <div className="mt-4 hidden gap-3 md:grid md:grid-cols-3 xl:grid-cols-6">{controls}</div>
      {open && <div className="fixed inset-0 z-[80] flex items-end bg-[#122318]/45 md:hidden" role="presentation" onClick={() => setOpen(false)}><div className="max-h-[85vh] w-full overflow-y-auto rounded-t-[26px] bg-[#fbfcf9] p-5 pb-[max(env(safe-area-inset-bottom),24px)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="mobile-filter-title" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#7c897a]">Katalog</p><h2 id="mobile-filter-title" className="mt-1 text-xl font-extrabold text-[#243729]">Filter racikan</h2></div><button type="button" aria-label="Tutup filter" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-[#edf1eb] text-[#445747]"><X size={18} /></button></div><div className="grid gap-3">{controls}<label className="grid gap-1.5 text-[11px] font-bold text-[#7e897c]">Urutkan<select className={selectClass} value={filters.sort} onChange={(event) => update("sort", event.target.value)}>{["Rekomendasi", "Rating Tertinggi", "Terpopuler", "Terbaru", "Harga Terendah"].map((item) => <option key={item}>{item}</option>)}</select></label></div><button type="button" onClick={() => setOpen(false)} className="mt-5 min-h-12 w-full rounded-xl bg-[#294b34] text-sm font-bold text-white">Tampilkan {resultCount} racikan</button></div></div>}
    </div>
  );
}
