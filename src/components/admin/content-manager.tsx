"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, CirclePlus, CloudRain, Droplets, Eye, FileDown, FilePenLine, FileSpreadsheet, Fish, Gauge, Globe2, ImageUp, ListChecks, Loader2, Plus, RotateCcw, Search, Send, Trash2, Wallet, Waves, X } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge, FishingTypeIcon, WaterBodyIcon, WaterIcon, WeatherIcon } from "@/components/shared";
import { ConditionTags, IngredientTable, PreparationSteps } from "@/components/recipe-details";
import { FISHING_TYPES, SEASON_CONDITIONS, WATER_BODIES, WATER_CONDITIONS, WEATHER_CONDITIONS, normalizeFishingType, primaryFishingType, type FishingType, type Ingredient } from "@/data/recipes";
import { provinces } from "@/data/provinces";
import { hargaAcuanDariLabel, slugify } from "@/lib/utils";
import { BAYESIAN_HINT, bayesianRatingScore, ratingScoreRanker } from "@/lib/rating-utils";
import type { RecipeRatingMap } from "@/lib/review-summary";
import { SELECT_FIELD_CLASS, SelectBox } from "@/components/form-fields";

/** Pilihan urutan pustaka konten. "skor" memakai rumus yang sama dengan katalog publik. */
const urutanKonten = ["Terakhir diubah", "Skor rating (Bayesian)", "Ulasan terbanyak", "Judul A–Z"] as const;
type UrutanKonten = (typeof urutanKonten)[number];

export type ManagedRecipe = {
  id: number; slug: string; title: string; summary: string; category: string; status: string; image: string; images: string[]; price: string; priceValue: number; difficulty: string; rating: number; reviewCount: number; users: number; popularity: number; weather: string[]; water: string[]; waterBodies: string[]; fishingTypes: string[]; provinces: string[]; seasons: string[]; ingredients: { name: string; brand: string; amount: string; optional?: boolean }[]; steps: string[]; suitable: string[]; notSuitable: string[]; author: string; createdAt: string; updatedAt: string;
};

/** Satu baris bahan di editor: bentuknya sama dengan yang tampil di halaman publik. */
type IngredientRow = { name: string; brand: string; amount: string; optional: boolean };

type RecipeForm = {
  title: string; slug: string; summary: string; status: string; image: string; images: string; price: string; difficulty: string; weather: string; water: string; waterBodies: string; fishingTypes: string; provinces: string; seasons: string; ingredients: IngredientRow[]; steps: string; suitable: string; notSuitable: string; author: string;
};

const statuses = ["draft", "published", "archived"];
const statusFilters = ["Semua", "published", "draft", "archived"];
const blankForm: RecipeForm = {
  title: "", slug: "", summary: "", status: "draft", image: "", images: "",
  price: "Rp15.000–30.000", difficulty: "Mudah", weather: "Hujan, Mendung", water: "Keruh", waterBodies: "Kolam",
  fishingTypes: "Harian", provinces: "Jawa Barat", seasons: "Musim Hujan",
  ingredients: [
    { name: "Pelet ikan", brand: "Pelet Jitu", amount: "50 g", optional: false },
    { name: "Tepung tapioka", brand: "Rose Brand", amount: "15 g", optional: false },
    { name: "Kroto", brand: "Segar", amount: "1 ons", optional: true },
  ],
  steps: "Haluskan pelet hingga lembut.\nCampurkan bahan kering sampai rata.\nTambahkan air sedikit demi sedikit sampai adonan mudah dibentuk.",
  suitable: "Kolam harian\nIkan mas aktif", notSuitable: "Air sangat jernih", author: "Tim UMPAN MAS",
};

const fieldClass = "min-h-11 w-full rounded-xl border border-[#e2e8e1] bg-white px-3.5 text-sm text-[#344638] outline-none transition placeholder:text-[#a1a89f] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";
const areaClass = "min-h-24 w-full resize-y rounded-xl border border-[#e2e8e1] bg-white px-3.5 py-3 text-sm leading-6 text-[#344638] outline-none transition placeholder:text-[#a1a89f] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";
const chipClass = "!h-7 !px-2.5 !text-[10px]";

function listFrom(text: string) { return text.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean); }

/** Baris bahan yang terisi lengkap, dipakai untuk menyimpan maupun pratinjau. */
function filledIngredients(rows: IngredientRow[]): Ingredient[] {
  return rows
    .map((row) => ({ name: row.name.trim(), brand: row.brand.trim() || "-", amount: row.amount.trim(), optional: row.optional }))
    .filter((row) => row.name && row.amount)
    .map((row) => ({ name: row.name, brand: row.brand, amount: row.amount, ...(row.optional ? { optional: true } : {}) }));
}

function formFromRecipe(recipe: ManagedRecipe): RecipeForm {
  return {
    title: recipe.title, slug: recipe.slug, summary: recipe.summary, status: recipe.status, image: recipe.image, images: (recipe.images?.length ? recipe.images : (recipe.image && recipe.image !== "/images/recipe-putih.jpg" ? [recipe.image] : [])).join("\n"),
    price: recipe.price, difficulty: recipe.difficulty, weather: recipe.weather.join(", "),
    water: recipe.water.join(", "), waterBodies: recipe.waterBodies.join(", "), fishingTypes: recipe.fishingTypes.join(", "), provinces: recipe.provinces.join(", "),
    seasons: recipe.seasons.join(", "),
    ingredients: recipe.ingredients.map((item) => ({ name: item.name, brand: item.brand, amount: item.amount, optional: Boolean(item.optional) })),
    steps: recipe.steps.join("\n"), suitable: recipe.suitable.join("\n"), notSuitable: recipe.notSuitable.join("\n"), author: recipe.author,
  };
}

function toPayload(form: RecipeForm, status = form.status) {
  return {
    ...form,
    title: form.title.trim(),
    slug: form.slug.trim() || slugify(form.title),
    summary: form.summary.trim(),
    status,
    // Harga acuan tidak lagi diketik manual: diturunkan dari label harga.
    priceValue: hargaAcuanDariLabel(form.price),
    images: listFrom(form.images),
    weather: listFrom(form.weather),
    water: listFrom(form.water),
    waterBodies: listFrom(form.waterBodies),
    fishingTypes: listFrom(form.fishingTypes),
    provinces: listFrom(form.provinces),
    seasons: listFrom(form.seasons),
    ingredients: filledIngredients(form.ingredients),
    steps: listFrom(form.steps),
    suitable: listFrom(form.suitable),
    notSuitable: listFrom(form.notSuitable),
  };
}

function formattedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function Field({ label, hint, children, wide = false }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return <label className={`grid gap-1.5 text-xs font-bold text-[#616c60] (4.71:1 terburuk) ${wide ? "sm:col-span-2" : ""}`}><span>{label}</span>{children}{hint && <span className="text-[10px] font-medium leading-4 text-[#959c93]">{hint}</span>}</label>;
}

/**
 * Editor bahan berbentuk baris, dipisah persis seperti tampilan publik:
 * "Bahan racikan" dan "Tambahan opsional". Tombol panah memindahkan sebuah
 * bahan antar bagian tanpa perlu mengetik ulang.
 */
function IngredientRowsEditor({ rows, onChange }: { rows: IngredientRow[]; onChange: (rows: IngredientRow[]) => void }) {
  const update = (index: number, patch: Partial<IngredientRow>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const groups = [
    { key: false, title: "Bahan racikan", note: "Bahan inti resep yang selalu dipakai." },
    { key: true, title: "Tambahan opsional", note: "Boleh dilewati. Bagian ini tidak menjadi pembeda di pencarian dan Pakar Umpan." },
  ] as const;

  return (
    <div className="grid gap-4">
      {groups.map((group) => {
        const indexes = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.optional === group.key);
        return (
          <div key={group.title} className={`rounded-2xl border p-3 ${group.key ? "border-[#efe7d3] bg-[#fdfbf6]" : "border-[#e6eae3] bg-white"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold text-[#354639]">{group.title} <span className="font-semibold text-[#959c93]">({indexes.length})</span></p>
                <p className="mt-0.5 text-[10px] font-medium text-[#959c93]">{group.note}</p>
              </div>
              <button type="button" onClick={() => onChange([...rows, { name: "", brand: "", amount: "", optional: group.key }])}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-dashed border-[#cfdac9] px-3 text-[11px] font-bold text-[#4f6b50] transition hover:bg-[#f4f7f2]">
                <Plus size={13} /> Tambah bahan
              </button>
            </div>
            {indexes.length === 0 ? (
              <p className="mt-3 rounded-xl bg-[#f6f8f4] px-3 py-2.5 text-[11px] text-[#929a91]">Belum ada bahan di bagian ini.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {indexes.map(({ row, index }, order) => (
                  <li key={index} className="grid gap-2 rounded-xl border border-[#e9ece6] bg-white p-2.5 sm:grid-cols-[28px_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,.7fr)_auto] sm:items-center">
                    <span className="hidden h-7 w-7 place-items-center rounded-lg bg-[#eff4ec] text-[10px] font-bold text-[#5a715c] (4.56:1 terburuk) sm:grid">{String(order + 1).padStart(2, "0")}</span>
                    <input className={fieldClass} value={row.name} placeholder="Nama bahan" aria-label={`Nama bahan ${group.title} ${order + 1}`} onChange={(event) => update(index, { name: event.target.value })} />
                    <input className={fieldClass} value={row.brand} placeholder="Merek / catatan" aria-label={`Merek bahan ${group.title} ${order + 1}`} onChange={(event) => update(index, { brand: event.target.value })} />
                    <input className={fieldClass} value={row.amount} placeholder="Takaran" aria-label={`Takaran bahan ${group.title} ${order + 1}`} onChange={(event) => update(index, { amount: event.target.value })} />
                    <div className="flex items-center gap-1 sm:justify-end">
                      <button type="button" onClick={() => update(index, { optional: !row.optional })}
                        aria-label={row.optional ? `Jadikan ${row.name || "bahan"} bahan inti` : `Jadikan ${row.name || "bahan"} tambahan opsional`}
                        title={row.optional ? "Pindahkan ke bahan racikan" : "Pindahkan ke tambahan opsional"}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#e2e7e0] px-2.5 text-[10px] font-bold text-[#5c6b5c] transition hover:bg-[#f4f7f2]">
                        <ListChecks size={13} /> {row.optional ? "Opsional" : "Inti"}
                      </button>
                      <button type="button" aria-label={`Hapus baris bahan ${order + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}
                        className="grid h-9 w-9 place-items-center rounded-xl text-[#905f50] (4.57:1 terburuk) transition hover:bg-[#fbefec]">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}


/**
 * Pemilih jenis kolam berbentuk centang, bukan teks bebas: satu resep boleh
 * cocok untuk beberapa jenis sekaligus — centang ketiganya bila resep bisa
 * dipakai di semua jenis kolam (harian, lomba, dan galatama). Nilai tetap
 * ditulis sebagai teks terpisah koma agar bentuk data formulir tidak berubah;
 * urutannya selalu urutan baku supaya kategori turunan stabil.
 */
function FishingTypePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const terpilih = new Set(listFrom(value).map(normalizeFishingType));
  const toggle = (type: FishingType) => {
    const berikutnya = new Set(terpilih);
    if (berikutnya.has(type)) berikutnya.delete(type); else berikutnya.add(type);
    onChange(FISHING_TYPES.filter((item) => berikutnya.has(item)).join(", "));
  };
  const semuaTerpilih = FISHING_TYPES.every((type) => terpilih.has(type));
  const toggleSemua = () => onChange(semuaTerpilih ? "" : FISHING_TYPES.join(", "));
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih jenis kolam">
      <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-xs font-bold transition ${semuaTerpilih ? "border-[#8fae87] bg-[#eef5ea] text-[#33523a]" : "border-dashed border-[#c9b458] bg-white text-[#7a5f14] hover:bg-[#fdf6e0]"}`}>
        <input type="checkbox" className="sr-only" checked={semuaTerpilih} onChange={toggleSemua} />
        {semuaTerpilih && <Check size={13} aria-hidden="true" />}
        Semua
      </label>
      {FISHING_TYPES.map((type) => {
        const aktif = terpilih.has(type);
        return (
          <label key={type} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-xs font-bold transition ${aktif ? "border-[#8fae87] bg-[#eef5ea] text-[#33523a]" : "border-[#e2e8e1] bg-white text-[#626e61] (4.59:1 terburuk) hover:bg-[#f6f8f5]"}`}>
            <input type="checkbox" className="sr-only" checked={aktif} onChange={() => toggle(type)} />
            {aktif && <Check size={13} aria-hidden="true" />}
            {type}
          </label>
        );
      })}
    </div>
  );
}


/** Pembungkus kolom khusus dropdown: bukan <label> agar daftar centang di dalamnya sah. */
function PilihanField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div className="grid gap-1.5 text-xs font-bold text-[#616c60] (4.71:1 terburuk)"><span>{label}</span>{children}{hint && <span className="text-[10px] font-medium leading-4 text-[#959c93]">{hint}</span>}</div>;
}

/**
 * Dropdown banyak pilihan untuk kolom kondisi: nilai dipilih dari daftar
 * resmi, bukan diketik bebas, supaya tidak ada nilai salah ketik yang
 * ditolak server atau tak pernah cocok dengan saringan publik. Boleh lebih
 * dari satu (mis. resep cocok untuk Hujan dan Mendung). Nilai disimpan
 * sebagai teks terpisah koma dalam urutan daftar; nilai lama yang tidak
 * ada di daftar tetap ditampilkan agar tidak hilang diam-diam saat
 * menyunting resep lama.
 */
function MultiSelectDropdown({ value, options, onChange, placeholder, searchable = false }: {
  value: string; options: readonly string[]; onChange: (value: string) => void; placeholder: string; searchable?: boolean;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const [kata, setKata] = useState("");
  const akarRef = useRef<HTMLDivElement>(null);

  // Panel dropdown melayang di atas isi lain (bukan mendorong grid), dan
  // menutup saat admin mengeklik di luar panel atau menekan Escape.
  useEffect(() => {
    if (!terbuka) return;
    const klikLuar = (event: PointerEvent) => {
      if (akarRef.current && !akarRef.current.contains(event.target as Node)) setTerbuka(false);
    };
    const tombol = (event: KeyboardEvent) => { if (event.key === "Escape") setTerbuka(false); };
    document.addEventListener("pointerdown", klikLuar);
    document.addEventListener("keydown", tombol);
    return () => {
      document.removeEventListener("pointerdown", klikLuar);
      document.removeEventListener("keydown", tombol);
    };
  }, [terbuka]);

  const terpilih = listFrom(value);
  const semuaPilihan = [...options, ...terpilih.filter((item) => !options.includes(item))];
  const tampil = searchable && kata.trim()
    ? semuaPilihan.filter((item) => item.toLocaleLowerCase("id-ID").includes(kata.trim().toLocaleLowerCase("id-ID")))
    : semuaPilihan;
  const toggle = (item: string) => {
    const berikutnya = new Set(terpilih);
    if (berikutnya.has(item)) berikutnya.delete(item); else berikutnya.add(item);
    onChange(semuaPilihan.filter((pilihan) => berikutnya.has(pilihan)).join(", "));
  };
  // "Pilih semua" memilih seluruh opsi sekaligus; ditekan lagi mengosongkan.
  const semuaTerpilih = options.length > 0 && options.every((item) => terpilih.includes(item));
  const toggleSemua = () => onChange(semuaTerpilih ? "" : semuaPilihan.join(", "));
  return (
    <div ref={akarRef} className="relative">
      <button type="button" aria-expanded={terbuka} aria-haspopup="true" onClick={() => setTerbuka((sebelum) => !sebelum)} className={`${fieldClass} flex items-center justify-between gap-2 text-left`}>
        <span className={`truncate ${terpilih.length ? "font-semibold" : "font-medium text-[#a1a89f]"}`}>{terpilih.length ? terpilih.join(", ") : placeholder}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {terpilih.length > 0 && <span className="rounded-full bg-[#eef5ea] px-2 py-0.5 text-[10px] font-extrabold text-[#33523a]">{terpilih.length}</span>}
          <ChevronDown size={15} aria-hidden="true" className={`text-[#7a857a] transition ${terbuka ? "rotate-180" : ""}`} />
        </span>
      </button>
      {terbuka && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-xl border border-[#e2e8e1] bg-white p-1.5 shadow-[0_16px_40px_rgba(36,53,39,.16)]">
          {searchable && <input value={kata} onChange={(event) => setKata(event.target.value)} placeholder="Cari provinsi…" aria-label="Cari provinsi" className="mb-1.5 min-h-9 w-full rounded-lg border border-[#e8ece5] bg-[#fbfcfa] px-3 text-xs font-medium text-[#344638] outline-none placeholder:text-[#a1a89f] focus:border-[#748f70]" />}
          {options.length > 1 && (
            <button type="button" onClick={toggleSemua} aria-pressed={semuaTerpilih} className={`mb-1 flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-bold transition ${semuaTerpilih ? "bg-[#eef5ea] text-[#33523a]" : "text-[#33523a] hover:bg-[#f6f8f5]"}`}>
              <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${semuaTerpilih ? "border-[#345d3a] bg-[#345d3a] text-white" : "border-[#c3cec0] bg-white text-transparent"}`}><Check size={11} /></span>
              {semuaTerpilih ? "Hapus semua pilihan" : "Pilih semua"}
            </button>
          )}
          <div className="grid max-h-52 gap-0.5 overflow-y-auto">
            {tampil.length ? tampil.map((item) => (
              <label key={item} className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-xs font-semibold transition ${terpilih.includes(item) ? "bg-[#eef5ea] text-[#33523a]" : "text-[#4c5a4d] hover:bg-[#f6f8f5]"}`}>
                <input type="checkbox" checked={terpilih.includes(item)} onChange={() => toggle(item)} className="h-4 w-4 shrink-0 accent-[#345d3a]" />
                <span className="min-w-0 flex-1 truncate">{item}</span>
              </label>
            )) : <p className="px-2.5 py-2 text-[11px] font-medium text-[#959c93]">Tidak ada pilihan yang cocok.</p>}
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * Dropdown satu pilihan dengan cangkang yang sama persis seperti
 * `MultiSelectDropdown`, agar semua kolom pilihan di formulir tampil
 * seragam (Tingkat kesulitan sebelumnya <select> bawaan peramban yang
 * tampil beda sendiri). Memilih satu nilai langsung menutup panel.
 */
function SingleSelectDropdown({ value, options, onChange, placeholder }: {
  value: string; options: readonly string[]; onChange: (value: string) => void; placeholder: string;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const akarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terbuka) return;
    const klikLuar = (event: PointerEvent) => {
      if (akarRef.current && !akarRef.current.contains(event.target as Node)) setTerbuka(false);
    };
    const tombol = (event: KeyboardEvent) => { if (event.key === "Escape") setTerbuka(false); };
    document.addEventListener("pointerdown", klikLuar);
    document.addEventListener("keydown", tombol);
    return () => {
      document.removeEventListener("pointerdown", klikLuar);
      document.removeEventListener("keydown", tombol);
    };
  }, [terbuka]);

  return (
    <div ref={akarRef} className="relative">
      <button type="button" aria-expanded={terbuka} aria-haspopup="true" onClick={() => setTerbuka((sebelum) => !sebelum)} className={`${fieldClass} flex items-center justify-between gap-2 text-left`}>
        <span className={`truncate ${value ? "font-semibold" : "font-medium text-[#a1a89f]"}`}>{value || placeholder}</span>
        <ChevronDown size={15} aria-hidden="true" className={`shrink-0 text-[#7a857a] transition ${terbuka ? "rotate-180" : ""}`} />
      </button>
      {terbuka && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-xl border border-[#e2e8e1] bg-white p-1.5 shadow-[0_16px_40px_rgba(36,53,39,.16)]">
          <div className="grid gap-0.5">
            {options.map((item) => (
              <button key={item} type="button" onClick={() => { onChange(item); setTerbuka(false); }} className={`flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold transition ${item === value ? "bg-[#eef5ea] text-[#33523a]" : "text-[#4c5a4d] hover:bg-[#f6f8f5]"}`}>
                <span className="min-w-0 flex-1 truncate">{item}</span>
                {item === value && <Check size={13} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Pratinjau memakai komponen yang sama dengan halaman publik, jadi tidak mungkin berbeda. */
function RecipePreview({ form }: { form: RecipeForm }) {
  const ingredients = filledIngredients(form.ingredients);
  const steps = listFrom(form.steps);
  // Sama seperti halaman publik: kategori dihitung dari jenis pemancingan.
  const kategori = primaryFishingType(form.title, listFrom(form.fishingTypes));
  const informasi = [
    { label: "Target", value: "Ikan mas", icon: Fish },
    { label: "Cuaca", value: listFrom(form.weather).slice(0, 2).join(" · ") || "—", icon: CloudRain },
    { label: "Kondisi air", value: listFrom(form.water).join(" · ") || "—", icon: Droplets },
    { label: "Jenis kolam", value: listFrom(form.fishingTypes).join(" · ") || "—", icon: Waves },
    { label: "Budget", value: form.price || "—", icon: Wallet },
    { label: "Kesulitan", value: form.difficulty, icon: Gauge },
  ];

  return (
    <div className="grid gap-6">
      <p className="rounded-xl border border-[#dbe8d7] bg-[#f0f6ed] px-4 py-3 text-[11px] leading-5 font-semibold text-[#436444]">
        Pratinjau ini memakai komponen yang sama dengan halaman publik, jadi yang Anda lihat di sini sama dengan yang dilihat pengunjung.
      </p>
      <section className="overflow-hidden rounded-[22px] border border-[#e5e9e2] bg-white">
        <div className="relative aspect-square w-full bg-[#e4e3d6]">
          {form.image && <Image src={form.image} alt="" fill sizes="640px" unoptimized={form.image.startsWith("blob:")} className="object-cover" />}
          <span className="absolute bottom-3 left-3 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-[#3a513d] backdrop-blur-sm">{kategori} · Ikan mas</span>
        </div>
        {listFrom(form.images).length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-b border-[#eef0ec] p-3">
            {listFrom(form.images).map((url) => (
              <span key={url} className={`relative aspect-square h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#edf1ea] ${url === form.image ? "ring-2 ring-[#294b34] ring-offset-1" : "opacity-75"}`}>
                <Image src={url} alt="" fill sizes="56px" unoptimized={url.startsWith("blob:")} className="object-cover" />
              </span>
            ))}
          </div>
        )}
        <div className="p-4 sm:p-5">
          <h3 className="break-words text-xl font-black tracking-[-.03em] text-[#213426]">{form.title || "Judul resep"}</h3>
          <p className="mt-2 break-words text-xs leading-5 text-[#636d63] (4.62:1 terburuk)">{form.summary || "Ringkasan resep tampil di sini."}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {informasi.map(({ label, value, icon: Icon }) => (
              <div key={label} className="min-w-0 rounded-xl border border-[#edf0eb] bg-[#fafbf8] p-2.5">
                <Icon size={14} className="text-[#5c705c] (4.59:1 terburuk)" />
                <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[.1em] text-[#969d94]">{label}</p>
                <p className="mt-0.5 break-words text-[11px] font-bold leading-4 text-[#405142]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <IngredientTable ingredients={ingredients} />
      {steps.length > 0 && <PreparationSteps steps={steps} />}
      <ConditionTags suitable={listFrom(form.suitable)} notSuitable={listFrom(form.notSuitable)} />
    </div>
  );
}

function RecipeEditor({ recipe, onClose, onSave }: { recipe?: ManagedRecipe; onClose: () => void; onSave: (payload: ReturnType<typeof toPayload>, id?: number) => Promise<void> }) {
  const [form, setForm] = useState<RecipeForm>(recipe ? formFromRecipe(recipe) : blankForm);
  const [tab, setTab] = useState<"formulir" | "pratinjau">("formulir");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof RecipeForm, value: string) => setForm((current) => ({ ...current, [key]: value, ...(key === "title" && !recipe ? { slug: slugify(value) } : {}) }));

  // Foto racikan ditahan lokal dulu (berkas + pratinjau objek di browser),
  // sama seperti form Bagikan: berkas baru BARU diunggah ke basis data saat
  // resep disimpan (lihat `siapkanPayload`). Menekan Batal karenanya tidak
  // menyimpan apa pun — tidak ada lagi foto yatim dari form yang dibatalkan.
  // Foto yang sudah tersimpan di server tetap berupa alamat di `images`,
  // dan `image` tetap menjadi thumbnail pilihannya.
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [fotoBaru, setFotoBaru] = useState<{ file: File; url: string }[]>([]);
  const [thumbnailBaru, setThumbnailBaru] = useState<number | null>(null);
  const fotoBaruUrls = useRef<string[]>([]);
  const galeri = listFrom(form.images);
  const totalFoto = galeri.length + fotoBaru.length;

  useEffect(() => () => { fotoBaruUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  function aturGaleri(urls: string[], thumbnail?: string) {
    setForm((current) => ({
      ...current,
      images: urls.join("\n"),
      image: thumbnail ?? (urls.includes(current.image) ? current.image : (urls[0] ?? "/images/recipe-putih.jpg")),
    }));
  }

  // `files` wajib sudah berupa salinan array: FileList dari input bersifat
  // live dan ikut kosong begitu nilai input direset untuk memilih ulang.
  function tambahFotoBaru(files: File[]) {
    const dipilih = files.slice(0, Math.max(0, 5 - totalFoto));
    setPhotoError(dipilih.length < files.length ? "Satu resep maksimal 5 foto. Hapus foto lain dulu." : "");
    const baru = dipilih.map((file) => ({ file, url: URL.createObjectURL(file) }));
    baru.forEach((item) => fotoBaruUrls.current.push(item.url));
    if (baru.length) setFotoBaru((cur) => [...cur, ...baru]);
  }

  function hapusFoto(url: string) {
    const berikut = galeri.filter((item) => item !== url);
    aturGaleri(berikut, form.image === url ? (berikut[0] ?? "/images/recipe-putih.jpg") : form.image);
  }

  function hapusFotoBaru(indeks: number) {
    const item = fotoBaru[indeks];
    if (item) { URL.revokeObjectURL(item.url); fotoBaruUrls.current = fotoBaruUrls.current.filter((url) => url !== item.url); }
    setFotoBaru((cur) => cur.filter((_, i) => i !== indeks));
    setThumbnailBaru((cur) => (cur === null || cur < indeks ? cur : cur === indeks ? null : cur - 1));
  }

  function pakaiFotoBawaan() {
    fotoBaru.forEach((item) => URL.revokeObjectURL(item.url));
    fotoBaruUrls.current = fotoBaruUrls.current.filter((url) => !fotoBaru.some((item) => item.url === url));
    setFotoBaru([]); setThumbnailBaru(null); setPhotoError("");
    aturGaleri([], "/images/recipe-putih.jpg");
  }

  /**
   * Unggah semua foto lokal ke basis data lalu susun payload akhir.
   * Tanpa foto lokal, payload langsung dari form. Bila satu unggahan gagal,
   * penyimpanan resep dibatalkan agar tidak ada resep setengah jadi.
   */
  async function siapkanPayload(status = form.status) {
    if (!fotoBaru.length) return toPayload(form, status);
    const slug = form.slug.trim() || slugify(form.title);
    if (!slug) throw new Error("Isi judul resep dulu agar fotonya bisa disimpan.");
    setPhotoBusy(true);
    try {
      const terunggah: string[] = [];
      for (const item of fotoBaru) {
        const body = new FormData();
        body.append("file", item.file);
        body.append("slug", slug);
        const response = await fetch("/api/admin/recipes/photo", { method: "POST", body });
        const result = await response.json().catch(() => ({})) as { error?: string; url?: string };
        if (!response.ok || !result.url) throw new Error(result.error ?? "Foto gagal diunggah.");
        terunggah.push(result.url);
      }
      const semua = [...galeri, ...terunggah];
      const thumbnail = thumbnailBaru !== null && terunggah[thumbnailBaru] ? terunggah[thumbnailBaru] : (semua.includes(form.image) ? form.image : semua[0]);
      return toPayload({ ...form, images: semua.join("\n"), image: thumbnail }, status);
    } finally { setPhotoBusy(false); }
  }

  // Bentuk form untuk pratinjau: foto lokal ikut tampil dari pratinjau objeknya.
  const formPratinjau: RecipeForm = {
    ...form,
    image: thumbnailBaru !== null && fotoBaru[thumbnailBaru] ? fotoBaru[thumbnailBaru].url : form.image,
    images: [...galeri, ...fotoBaru.map((item) => item.url)].join("\n"),
  };

  const ingredients = filledIngredients(form.ingredients);
  const optionalCount = ingredients.filter((item) => item.optional).length;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (listFrom(form.fishingTypes).length === 0) { setError("Pilih minimal satu jenis kolam untuk resep ini."); return; }
    if (ingredients.length === 0) { setError("Tambahkan minimal satu bahan: isi nama dan takarannya."); return; }
    if (listFrom(form.steps).length === 0) { setError("Tambahkan setidaknya satu langkah persiapan."); return; }
    setBusy(true);
    try { await onSave(await siapkanPayload(), recipe?.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Konten gagal disimpan."); }
    finally { setBusy(false); }
  }

  async function publish(status: string) {
    setError("");
    if (form.title.trim().length < 3 || form.summary.trim().length < 15) { setError("Lengkapi judul dan ringkasan sebelum mengganti status."); return; }
    if (listFrom(form.fishingTypes).length === 0) { setError("Pilih minimal satu jenis kolam untuk resep ini."); return; }
    if (ingredients.length === 0) { setError("Tambahkan minimal satu bahan: isi nama dan takarannya."); return; }
    setBusy(true);
    try { await onSave(await siapkanPayload(status), recipe?.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Konten gagal disimpan."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#16251b]/55 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="recipe-editor-title" className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-[25px] bg-[#f9faf8] shadow-2xl sm:rounded-[25px]">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#e7ebe4] bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-[#656d64] (4.59:1 terburuk)">Content Studio / Resep</p>
            <h2 id="recipe-editor-title" className="mt-1 text-lg font-black text-[#2b3c2e]">{recipe ? "Edit resep" : "Tulis resep baru"}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-[#eff3ec] p-1" role="tablist" aria-label="Mode editor">
              {([["formulir", "Formulir"], ["pratinjau", "Pratinjau"]] as const).map(([value, label]) => (
                <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition ${tab === value ? "bg-white text-[#315a39] shadow-sm" : "text-[#626e61] (4.59:1 terburuk)"}`}>
                  {value === "pratinjau" && <Eye size={13} />}{label}
                </button>
              ))}
            </div>
            <button type="button" aria-label="Tutup editor" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[#f0f3ed] text-[#536253] hover:bg-[#e5ebe2]"><X size={17} /></button>
          </div>
        </div>

        {/*
          Formulir dan pratinjau selalu terpasang: saat pratinjau aktif, isian
          disembunyikan (bukan dibuang) supaya tombol simpan/publikasikan di
          footer tetap bekerja tanpa kehilangan data yang sudah diisi.
        */}
        <form onSubmit={submit} noValidate={tab !== "formulir"}>
          <div className={tab === "pratinjau" ? "hidden" : "space-y-5 p-4 sm:p-6"}>
            <section className="rounded-2xl border border-[#e7ebe5] bg-white p-4">
              <h3 className="text-xs font-extrabold uppercase tracking-[.11em] text-[#58685a]">Informasi utama</h3>
              <div className="mt-4 grid items-start gap-3 sm:grid-cols-2">
                <Field label="Judul resep"><input autoFocus className={fieldClass} value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={180} minLength={3} placeholder="Tulis judul resep" required /></Field>
                <Field label="Slug URL" hint="Alamat halaman detail. Harus unik."><input className={fieldClass} value={form.slug} onChange={(event) => update("slug", slugify(event.target.value))} maxLength={180} placeholder="slug-resep" required /></Field>
                <Field label="Status konten"><select className={fieldClass} value={form.status} onChange={(event) => update("status", event.target.value)}>{statuses.map((item) => <option key={item} value={item}>{item === "published" ? "Published · tampil publik" : item === "draft" ? "Draft · hanya admin" : "Archived · disimpan"}</option>)}</select></Field>
                <Field label="Ringkasan" wide><textarea className={areaClass} value={form.summary} onChange={(event) => update("summary", event.target.value)} maxLength={1500} minLength={15} placeholder="Jelaskan karakter racikan dan konteks yang sesuai." required /><span className="text-right text-[10px] font-medium text-[#939b91]">{form.summary.length}/1.500</span></Field>
                <div className="grid gap-1.5 text-xs font-bold text-[#616c60] (4.71:1 terburuk) sm:col-span-2">
                  <span>Foto racikan <span className="font-semibold text-[#959c93]">({totalFoto}/5 foto · tampilan persegi 1:1)</span></span>
                  {totalFoto > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {galeri.map((url) => (
                        <div key={url} className={`relative aspect-square overflow-hidden rounded-xl border border-[#e8ece5] bg-[#edf1ea] ${thumbnailBaru === null && url === form.image ? "ring-2 ring-[#294b34] ring-offset-1" : ""}`}>
                          <Image src={url} alt="" fill sizes="120px" unoptimized={url.startsWith("/api/media/")} className="object-cover" />
                          {thumbnailBaru === null && url === form.image && <span className="absolute left-1.5 top-1.5 rounded-full bg-[#16251b]/80 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-white">Thumbnail</span>}
                          <span className="absolute inset-x-1.5 bottom-1.5 flex gap-1">
                            <button type="button" disabled={photoBusy || (thumbnailBaru === null && url === form.image)} onClick={() => { aturGaleri(galeri, url); setThumbnailBaru(null); }} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-white/95 px-1.5 text-[9px] font-extrabold text-[#315a39] shadow-sm transition hover:bg-white disabled:opacity-60">
                              <Check size={11} /> Utama
                            </button>
                            <button type="button" disabled={photoBusy} onClick={() => hapusFoto(url)} aria-label="Hapus foto" className="grid h-7 w-7 place-items-center rounded-lg bg-white/95 text-[#8a4433] shadow-sm transition hover:bg-white disabled:opacity-60">
                              <Trash2 size={12} />
                            </button>
                          </span>
                        </div>
                      ))}
                      {fotoBaru.map((item, indeks) => (
                        <div key={item.url} className={`relative aspect-square overflow-hidden rounded-xl border border-[#e8ece5] bg-[#edf1ea] ${thumbnailBaru === indeks ? "ring-2 ring-[#294b34] ring-offset-1" : ""}`}>
                          <Image src={item.url} alt="" fill sizes="120px" unoptimized className="object-cover" />
                          <span className="absolute right-1.5 top-1.5 rounded-full bg-white/85 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-[#5c6a5c]">Baru</span>
                          {thumbnailBaru === indeks && <span className="absolute left-1.5 top-1.5 rounded-full bg-[#16251b]/80 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-white">Thumbnail</span>}
                          <span className="absolute inset-x-1.5 bottom-1.5 flex gap-1">
                            <button type="button" disabled={photoBusy || thumbnailBaru === indeks} onClick={() => setThumbnailBaru(indeks)} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-white/95 px-1.5 text-[9px] font-extrabold text-[#315a39] shadow-sm transition hover:bg-white disabled:opacity-60">
                              <Check size={11} /> Utama
                            </button>
                            <button type="button" disabled={photoBusy} onClick={() => hapusFotoBaru(indeks)} aria-label="Hapus foto" className="grid h-7 w-7 place-items-center rounded-lg bg-white/95 text-[#8a4433] shadow-sm transition hover:bg-white disabled:opacity-60">
                              <Trash2 size={12} />
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" aria-label="Pilih berkas foto racikan"
                      onChange={(event) => { const files = event.target.files ? [...event.target.files] : []; event.target.value = ""; if (files.length) tambahFotoBaru(files); }} />
                    <button type="button" disabled={photoBusy || totalFoto >= 5} onClick={() => photoInputRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29] disabled:opacity-60">
                      {photoBusy ? <Loader2 size={15} className="animate-spin" /> : <ImageUp size={15} />} {totalFoto ? "Tambah foto" : "Pilih foto"}
                    </button>
                    {totalFoto > 0 && (
                      <button type="button" disabled={photoBusy} onClick={pakaiFotoBawaan} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
                        <RotateCcw size={14} /> Pakai foto bawaan
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] font-medium leading-4 text-[#959c93]">Foto bertanda Thumbnail yang tampil di kartu dan hasil berbagi. Berkas PNG, JPEG, atau WebP (maks 3 MB per foto, maksimal 5 foto). <strong>Foto baru hanya ditahan di perangkat ini dan diunggah saat resep disimpan</strong> — membatalkan form tidak menyimpan apa pun ke basis data. Penghapusan foto lama berlaku setelah resep disimpan.</p>
                  {photoError && <p role="alert" className="text-[11px] font-semibold leading-4 text-[#a4442f] (4.59:1 terburuk)">{photoError}</p>}
                </div>
                <Field label="Penulis"><input className={fieldClass} value={form.author} onChange={(event) => update("author", event.target.value)} maxLength={100} /></Field>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e7ebe5] bg-white p-4">
              <h3 className="text-xs font-extrabold uppercase tracking-[.11em] text-[#58685a]">Kondisi & harga</h3>
              <div className="mt-4 grid items-start gap-3 sm:grid-cols-2">
                <PilihanField label="Cuaca"><MultiSelectDropdown value={form.weather} options={WEATHER_CONDITIONS} onChange={(value) => update("weather", value)} placeholder="Pilih cuaca" /></PilihanField>
                <PilihanField label="Kondisi air" hint="Warna air kolam/spot"><MultiSelectDropdown value={form.water} options={WATER_CONDITIONS} onChange={(value) => update("water", value)} placeholder="Pilih kondisi air" /></PilihanField>
                <PilihanField label="Tipe air"><MultiSelectDropdown value={form.waterBodies} options={WATER_BODIES} onChange={(value) => update("waterBodies", value)} placeholder="Pilih tipe air" /></PilihanField>
                <Field label="Jenis kolam" hint="Bisa dipilih lebih dari satu. Centang ketiganya bila resep ini cocok untuk semua jenis kolam."><FishingTypePicker value={form.fishingTypes} onChange={(value) => update("fishingTypes", value)} /></Field>
                <PilihanField label="Musim"><MultiSelectDropdown value={form.seasons} options={SEASON_CONDITIONS} onChange={(value) => update("seasons", value)} placeholder="Pilih musim" /></PilihanField>
                <PilihanField label="Provinsi terkait"><MultiSelectDropdown value={form.provinces} options={provinces.map((province) => province.name)} onChange={(value) => update("provinces", value)} placeholder="Pilih provinsi" searchable /></PilihanField>
                <PilihanField label="Tingkat kesulitan"><SingleSelectDropdown value={form.difficulty} options={["Mudah", "Menengah", "Tingkat lanjut"]} onChange={(value) => update("difficulty", value)} placeholder="Pilih tingkat kesulitan" /></PilihanField>
                <Field label="Label harga" hint="Harga acuan untuk saringan budget dihitung otomatis dari rentang ini (titik tengahnya), jadi tidak perlu diisi angka terpisah."><input className={fieldClass} value={form.price} onChange={(event) => update("price", event.target.value)} maxLength={80} placeholder="Rp20.000–25.000" /></Field>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e7ebe5] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-[.11em] text-[#58685a]">Bahan racikan</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="sage">{ingredients.length - optionalCount} bahan</Badge>
                  {optionalCount > 0 && <Badge tone="gold">{optionalCount} tambahan opsional</Badge>}
                </div>
              </div>
              <p className="mt-2 text-[10px] font-medium leading-4 text-[#959c93]">Susunannya sama dengan yang tampil di halaman publik. Tombol Inti/Opsional memindahkan bahan antar bagian.</p>
              <div className="mt-3"><IngredientRowsEditor rows={form.ingredients} onChange={(rows) => setForm({ ...form, ingredients: rows })} /></div>
            </section>

            <section className="rounded-2xl border border-[#e7ebe5] bg-white p-4">
              <h3 className="text-xs font-extrabold uppercase tracking-[.11em] text-[#58685a]">Langkah & catatan kondisi</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Langkah persiapan" hint="Satu langkah per baris" wide><textarea className={`${areaClass} min-h-32`} value={form.steps} onChange={(event) => update("steps", event.target.value)} placeholder={"Haluskan pelet.\nCampurkan bahan kering.\nTambahkan air perlahan."} /></Field>
                <Field label="Cocok untuk" hint="Pisahkan dengan baris baru atau koma"><textarea className={areaClass} value={form.suitable} onChange={(event) => update("suitable", event.target.value)} /></Field>
                <Field label="Kurang cocok untuk" hint="Pisahkan dengan baris baru atau koma"><textarea className={areaClass} value={form.notSuitable} onChange={(event) => update("notSuitable", event.target.value)} /></Field>
              </div>
            </section>

          </div>
          {tab === "pratinjau" && (
            <div className="space-y-4 p-4 sm:p-6">
              <p className="flex items-center gap-2 rounded-xl border border-[#dbe8d7] bg-[#f0f6ed] px-4 py-3 text-[11px] font-semibold text-[#436444]"><Eye size={14} /> Mode pratinjau — perubahan belum disimpan sampai Anda menekan “Simpan perubahan”.</p>
              <RecipePreview form={formPratinjau} />
            </div>
          )}
          {error && <p role="alert" className="mx-4 mb-2 rounded-xl border border-[#efdcd5] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold leading-5 text-[#9c513e] sm:mx-6">{error}</p>}
          <div className="sticky bottom-0 flex flex-col-reverse justify-between gap-2 border-t border-[#e6eae4] bg-[#f9faf8]/95 px-4 py-3 backdrop-blur sm:flex-row sm:px-6">
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#636e63] (4.57:1 terburuk)">Batal</button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setTab(tab === "pratinjau" ? "formulir" : "pratinjau")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dce4d9] bg-white px-4 text-xs font-bold text-[#456047] hover:bg-[#f3f6f0]"><Eye size={14} /> {tab === "pratinjau" ? "Kembali ke formulir" : "Lihat pratinjau"}</button>
              <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dce4d9] bg-white px-4 text-xs font-bold text-[#456047] hover:bg-[#f3f6f0] disabled:opacity-60"><Check size={14} /> {busy ? "Menyimpan…" : "Simpan perubahan"}</button>
              <button type="button" disabled={busy} onClick={() => void publish("published")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-xs font-bold text-white hover:bg-[#203d29] disabled:opacity-60"><Send size={14} /> Publikasikan</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

export function ContentManager() {
  const router = useRouter();
  const [items, setItems] = useState<ManagedRecipe[]>([]);
  const [filter, setFilter] = useState("Semua");
  const [query, setQuery] = useState("");
  const [urut, setUrut] = useState<UrutanKonten>("Terakhir diubah");
  /**
   * Ulasan nyata (tabel ulasan) — angka yang sama dengan yang dipakai katalog
   * publik. Angka katalog pada baris tabel tetap ditampilkan terpisah dan
   * berlabel "angka katalog", jadi keduanya tidak pernah tertukar.
   */
  const [ulasan, setUlasan] = useState<{ ratings: RecipeRatingMap; globalAverage: number; minReviews: number }>({ ratings: {}, globalAverage: 0, minReviews: 20 });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedRecipe | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [excelFailures, setExcelFailures] = useState<{ baris: number; judul: string; pesan: string }[]>([]);

  async function load(signal?: AbortSignal) {
    const response = await fetch("/api/admin/recipes", { cache: "no-store", signal });
    const body = await response.json() as { recipes?: ManagedRecipe[]; error?: string; reviews?: RecipeRatingMap; global?: { average?: number }; minReviews?: number };
    if (!response.ok) throw new Error(body.error ?? "Konten tidak dapat dimuat.");
    setItems(body.recipes ?? []);
    setUlasan({
      ratings: body.reviews ?? {},
      globalAverage: typeof body.global?.average === "number" ? body.global.average : 0,
      minReviews: typeof body.minReviews === "number" ? body.minReviews : 20,
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void load(controller.signal).catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Gagal memuat konten."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
      if (new URLSearchParams(window.location.search).get("create") === "1") setEditorOpen(true);
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, []);

  // Daftar diurutkan di sini memakai angka yang sama dengan katalog publik:
  // "Skor rating (Bayesian)" memakai rata-rata Bayesian (m dari server), bukan
  // rata-rata mentah, supaya editor melihat urutan yang benar-benar tampil.
  const rankerRating = useMemo(() => ratingScoreRanker(ulasan.ratings, ulasan.globalAverage || null, ulasan.minReviews), [ulasan]);
  const filtered = useMemo(() => {
    const hasil = items.filter((item) => (filter === "Semua" || item.status === filter) && `${item.title} ${item.slug} ${item.author}`.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID")));
    if (urut === "Skor rating (Bayesian)") return [...hasil].sort(rankerRating);
    if (urut === "Ulasan terbanyak") return [...hasil].sort((a, b) => (ulasan.ratings[b.slug]?.count ?? 0) - (ulasan.ratings[a.slug]?.count ?? 0) || rankerRating(a, b));
    if (urut === "Judul A–Z") return [...hasil].sort((a, b) => a.title.localeCompare(b.title, "id-ID"));
    return hasil;
  }, [items, filter, query, urut, rankerRating, ulasan.ratings]);
  const counts = useMemo(() => ({ all: items.length, published: items.filter((item) => item.status === "published").length, draft: items.filter((item) => item.status === "draft").length, archived: items.filter((item) => item.status === "archived").length }), [items]);

  async function importExcel(file: File) {
    setImportingExcel(true); setError(""); setNotice(""); setExcelFailures([]);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/recipes/import-spreadsheet", { method: "POST", body });
      const result = await response.json().catch(() => ({})) as { error?: string; created?: number; updated?: number; failed?: { baris: number; judul: string; pesan: string }[] };
      if (result.failed?.length) setExcelFailures(result.failed);
      if (!response.ok) throw new Error(result.error ?? "Impor Excel gagal.");
      setNotice(`Impor Excel selesai: ${result.created ?? 0} resep baru ditambahkan, ${result.updated ?? 0} resep diperbarui.`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Impor Excel gagal."); }
    finally { setImportingExcel(false); }
  }

  async function save(payload: ReturnType<typeof toPayload>, id?: number) {
    const response = await fetch(id ? `/api/admin/recipes/${id}` : "/api/admin/recipes", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json() as { error?: string };
    if (!response.ok) throw new Error(body.error ?? "Konten gagal disimpan.");
    setNotice(id ? "Resep diperbarui." : "Resep baru dibuat.");
    setError(""); setEditorOpen(false); setEditing(undefined);
    await load();
    router.replace("/dashboard/konten");
  }

  async function changeStatus(item: ManagedRecipe, status: string) {
    setPending(item.id); setError(""); setNotice("");
    try { await save(toPayload(formFromRecipe(item), status), item.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Status gagal diubah."); }
    finally { setPending(null); }
  }

  async function remove(item: ManagedRecipe) {
    if (!window.confirm(`Hapus resep “${item.title}”? Tindakan ini tidak dapat dibatalkan.`)) return;
    setPending(item.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/recipes/${item.id}`, { method: "DELETE" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Konten gagal dihapus.");
      setItems((current) => current.filter((entry) => entry.id !== item.id)); setNotice("Resep berhasil dihapus.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Konten gagal dihapus."); }
    finally { setPending(null); }
  }

  return (
    <AdminShell>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#656d64] (4.59:1 terburuk)"><Link href="/dashboard" className="hover:text-[#3f6044]">Studio</Link><span>/</span><span>Konten</span></div>
          <h1 className="mt-2 text-3xl font-black tracking-[-.045em] text-[#25372a] sm:text-4xl">Konten resep</h1>
          <p className="mt-2 text-sm text-[#626c62] (4.69:1 terburuk)">Susun, tinjau, dan publikasikan racikan umpan ikan mas.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button type="button" onClick={() => { setEditing(undefined); setEditorOpen(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29]"><Plus size={16} /> Tulis resep</button>
        </div>
      </div>

      <section aria-label="Impor resep dari Excel" className="mb-5 rounded-[20px] border border-[#d8e4d2] bg-[#f3f7f0] p-4 shadow-[0_5px_20px_rgba(36,53,39,.03)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#294b34] text-white shadow-sm"><FileSpreadsheet size={21} aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold tracking-tight text-[#2c4231]">Impor resep dari Excel</h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-[#5c6a5c]">Tambah banyak resep sekaligus tanpa mengisi formulir satu per satu: unduh template-nya, isi satu baris untuk satu resep, lalu unggah kembali berkasnya di sini. Baris yang tidak valid tidak akan disimpan dan dilaporkan per baris.</p>
              <p className="mt-2.5 flex flex-wrap gap-1.5">
                {["Format .xlsx / .csv", "Maks 2 MB", "Maks 200 baris", "Slug sama = diperbarui"].map((catatan) => <span key={catatan} className="rounded-full border border-[#dbe5d5] bg-white px-2.5 py-1 text-[10px] font-bold text-[#506550]">{catatan}</span>)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:shrink-0">
            {/* Unduhan berkas dari API (bukan navigasi halaman), jadi <a download> memang yang tepat. */}
            <a href="/api/admin/recipes/import-spreadsheet/template" download className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#203d29]"><FileDown size={16} aria-hidden="true" /> Download Template Excel</a>
            <button type="button" onClick={() => excelInputRef.current?.click()} disabled={importingExcel} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#c9d8c5] bg-white px-5 text-xs font-extrabold text-[#3c5a41] transition hover:bg-[#eef4ea] disabled:opacity-60"><FileSpreadsheet size={16} aria-hidden="true" />{importingExcel ? "Mengimpor…" : "Upload Excel"}</button>
          </div>
        </div>
        <input ref={excelInputRef} type="file" accept=".xlsx,.csv" className="hidden" aria-label="Pilih berkas Excel atau CSV berisi resep" onChange={(event) => { const berkas = event.target.files?.[0]; event.target.value = ""; if (berkas) void importExcel(berkas); }} />
      </section>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#e6eae4] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#929a91]">Semua konten</p><p className="mt-2 text-2xl font-black text-[#344638]">{counts.all}</p></div>
        <div className="rounded-2xl border border-[#e6eae4] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#929a91]">Tayang publik</p><p className="mt-2 text-2xl font-black text-[#46714b]">{counts.published}</p></div>
        <div className="rounded-2xl border border-[#e6eae4] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#929a91]">Draft</p><p className="mt-2 text-2xl font-black text-[#7d6839] (4.61:1 terburuk)">{counts.draft}</p></div>
        <div className="rounded-2xl border border-[#e6eae4] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#929a91]">Diarsipkan</p><p className="mt-2 text-2xl font-black text-[#626d62] (4.64:1 terburuk)">{counts.archived}</p></div>
      </div>

      {notice && <p role="status" className="mb-4 rounded-xl border border-[#dbe8d7] bg-[#f0f6ed] px-4 py-3 text-xs font-semibold text-[#436444]">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold text-[#995744]">{error}</p>}
      {excelFailures.length > 0 && (
        <div role="alert" className="mb-4 rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs text-[#995744]">
          <p className="font-bold">Baris yang belum valid — belum ada resep yang disimpan:</p>
          <ul className="mt-2 grid max-h-44 gap-1 overflow-y-auto pr-1">
            {excelFailures.map((gagal) => <li key={`${gagal.baris}-${gagal.judul}`}>Baris {gagal.baris} — {gagal.judul}: {gagal.pesan}</li>)}
          </ul>
        </div>
      )}

      <section className="overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]">
        <div className="flex flex-col gap-3 border-b border-[#eef0ec] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div><h2 className="text-sm font-extrabold text-[#344638]">Pustaka racikan</h2><p className="mt-1 text-[10px] text-[#929a91]">{filtered.length} dari {items.length} resep CMS</p></div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#e4e9e2] px-3 sm:w-72"><Search size={15} className="text-[#929a91]" /><span className="sr-only">Cari konten</span><input className="w-full bg-transparent text-xs outline-none placeholder:text-[#a0a79f]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul atau slug…" /></label>
              <label className="flex items-center gap-2 text-[10px] font-bold text-[#636d62] (4.63:1 terburuk)">Urutkan<SelectBox><select className={`${SELECT_FIELD_CLASS} min-h-12 rounded-xl border border-[#e4e9e2] bg-white pl-3 text-xs font-semibold text-[#3b493e] outline-none focus:border-[#748f70] sm:min-h-10`} value={urut} onChange={(event) => setUrut(event.target.value as UrutanKonten)}>{urutanKonten.map((item) => <option key={item}>{item}</option>)}</select></SelectBox></label>
            </div>
          </div>
          {urut === "Skor rating (Bayesian)" && <p className="rounded-xl bg-[#f6f8f4] px-3.5 py-2.5 text-[10px] leading-5 text-[#656d64] (4.59:1 terburuk)">{BAYESIAN_HINT} Resep tanpa ulasan selalu di bawah resep yang sudah diulas.</p>}
          <div className="flex gap-2 overflow-x-auto">
            {statusFilters.map((item) => (
              <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} className={`min-h-8 shrink-0 rounded-full px-3 text-[10px] font-bold transition ${filter === item ? "bg-[#294b34] text-white" : "bg-[#f3f5f1] text-[#626e62] (4.59:1 terburuk) hover:bg-[#e8eee5]"}`}>
                {item === "Semua" ? `Semua · ${counts.all}` : item === "published" ? `Tayang · ${counts.published}` : item === "draft" ? `Draft · ${counts.draft}` : `Arsip · ${counts.archived}`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 p-4">{[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-[#f1f4ef]" />)}</div>
        ) : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-[#eef0ec] text-[9px] font-extrabold uppercase tracking-[.12em] text-[#9ba198]">
                  <th className="px-5 py-3">Judul konten</th><th className="px-4 py-3">Kondisi</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Diperbarui</th><th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2ee]">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition hover:bg-[#fafbf9]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#edf1ea]"><Image src={item.image || "/images/recipe-putih.jpg"} alt="" fill sizes="48px" className="object-cover" /></span>
                        <div className="min-w-0">
                          <p className="max-w-[270px] truncate text-xs font-extrabold text-[#37483a]">{item.title}</p>
                          <p className="mt-1 max-w-[270px] truncate text-[9px] text-[#969d94]">/{item.slug} · angka katalog {(item.rating / 10).toFixed(1)} dari 5 · {new Intl.NumberFormat("id-ID").format(item.users)} pemancing</p>
                          <p className="mt-0.5 max-w-[270px] truncate text-[9px] font-semibold text-[#626e63] (4.58:1 terburuk)">{(() => {
                            const rating = ulasan.ratings[item.slug];
                            if (!rating || rating.count <= 0) return "Belum ada ulasan pengunjung";
                            const skor = bayesianRatingScore(rating, ulasan.globalAverage || null, ulasan.minReviews);
                            return `Ulasan nyata ${rating.average.toFixed(1)} dari 5 dari ${new Intl.NumberFormat("id-ID").format(rating.count)} ulasan${skor === null ? "" : ` · skor peringkat ${skor.toFixed(2)}`}`;
                          })()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex max-w-[260px] flex-wrap gap-1.5">
                        {item.weather.slice(0, 1).map((weather) => <Badge key={weather} className={chipClass}><WeatherIcon weather={weather} size={10} /> {weather}</Badge>)}
                        {item.water.slice(0, 1).map((water) => <Badge key={water} tone="cream" className={chipClass}><WaterIcon size={10} /> {water}</Badge>)}
                        {item.waterBodies.slice(0, 1).map((body) => <Badge key={body} tone="cream" className={chipClass}><WaterBodyIcon size={10} /> {body}</Badge>)}
                        {item.fishingTypes.slice(0, 1).map((type) => <Badge key={type} tone="cream" className={chipClass}><FishingTypeIcon size={10} /> {type}</Badge>)}
                      </div>
                      <p className="mt-1.5 text-[9px] font-semibold text-[#969d94]">{item.ingredients.filter((entry) => !entry.optional).length} bahan · {item.ingredients.filter((entry) => entry.optional).length} opsional</p>
                    </td>
                    <td className="px-4 py-3.5"><Badge tone={item.status === "published" ? "sage" : item.status === "draft" ? "gold" : "cream"}>{item.status === "published" ? "Published" : item.status === "draft" ? "Draft" : "Archived"}</Badge></td>
                    <td className="px-4 py-3.5 text-[10px] text-[#929a91]">{formattedDate(item.updatedAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/konten?edit=${item.id}`} aria-label={`Buka detail ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#5f6f5e] (4.59:1 terburuk) hover:bg-[#edf3e9] hover:text-[#345b3a]"><Eye size={14} /></Link>
                        <button type="button" onClick={() => { setEditing(item); setEditorOpen(true); }} aria-label={`Edit ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#5f6f5e] (4.59:1 terburuk) hover:bg-[#edf3e9] hover:text-[#345b3a]"><FilePenLine size={14} /></button>
                        {item.status !== "published" ? (
                          <button type="button" onClick={() => void changeStatus(item, "published")} disabled={pending === item.id} aria-label={`Publikasikan ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#517250] (4.65:1 terburuk) hover:bg-[#edf3e9] disabled:opacity-40"><Globe2 size={14} /></button>
                        ) : (
                          <button type="button" onClick={() => void changeStatus(item, "draft")} disabled={pending === item.id} aria-label={`Jadikan ${item.title} draft`} className="grid h-8 w-8 place-items-center rounded-lg text-[#7b693f] (4.58:1 terburuk) hover:bg-[#f8f4e9] disabled:opacity-40"><FilePenLine size={14} /></button>
                        )}
                        <button type="button" onClick={() => void remove(item)} disabled={pending === item.id} aria-label={`Hapus ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#905f50] (4.57:1 terburuk) hover:bg-[#fbefec] disabled:opacity-40"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
            <div>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#eef3e9] text-[#597157] (4.59:1 terburuk)"><CirclePlus size={21} /></span>
              <h3 className="mt-4 text-sm font-extrabold text-[#3b4b3d]">{query || filter !== "Semua" ? "Konten tidak ditemukan" : "Mulai pustaka racikan"}</h3>
              <p className="mt-1.5 max-w-sm text-xs leading-5 text-[#656d65] (4.59:1 terburuk)">{query || filter !== "Semua" ? "Coba kata kunci atau status yang lain." : "Buat resep, simpan sebagai draft, lalu publikasikan saat siap."}</p>
              <button type="button" onClick={() => { setEditing(undefined); setEditorOpen(true); }} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-bold text-white"><Plus size={14} /> Buat resep pertama <ArrowRight size={13} /></button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef0ec] bg-[#fafbf9] px-4 py-3 text-[9px] text-[#959c93] sm:px-5">
          <span>Database PostgreSQL · perubahan langsung</span>
          <span className="inline-flex items-center gap-1"><ChevronDown size={12} /> {items.length} resep</span>
        </div>
      </section>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#edf2e9] px-4 py-3 text-[10px] leading-5 text-[#626e62] (4.59:1 terburuk)"><Globe2 size={13} className="mt-0.5 shrink-0" />Status <strong>Published</strong> membuat resep tersedia di katalog publik. Draft dan arsip hanya tampil di dashboard.</div>

      {editorOpen && <RecipeEditor key={editing?.id ?? "new"} recipe={editing} onClose={() => { setEditorOpen(false); setEditing(undefined); router.replace("/dashboard/konten"); }} onSave={save} />}
    </AdminShell>
  );
}
