"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, CirclePlus, CloudRain, Droplets, Eye, FileDown, FilePenLine, FileSpreadsheet, Fish, Gauge, Globe2, ImageUp, Loader2, Plus, RotateCcw, Search, Send, Trash2, Wallet, Waves, X } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminCan, useAdminMe } from "@/components/admin/use-admin-me";
import { Badge, FishingTypeIcon, WaterBodyIcon, WaterIcon, WeatherIcon } from "@/components/shared";
import { ConditionTags, IngredientTable, PreparationSteps } from "@/components/recipe-details";
import { FISHING_TYPES, WATER_CONDITIONS, WEATHER_CONDITIONS, normalizeFishingType, primaryFishingType, type FishingType, type Ingredient } from "@/data/recipes";
import { provinces } from "@/data/provinces";
import { BIAYA_BAWAAN_RESEP, PILIHAN_BIAYA_CEPAT, hargaAcuanDariLabel, slugify } from "@/lib/utils";
import { BAYESIAN_HINT, bayesianRatingScore, ratingScoreRanker } from "@/lib/rating-utils";
import { kompresGambar } from "@/lib/image-compress";
import type { RecipeRatingMap } from "@/lib/review-summary";
import { SELECT_FIELD_CLASS, SelectBox } from "@/components/form-fields";
import { UseMyLocationButton } from "@/components/location-controls";
import { useLocationAutofill } from "@/lib/use-location";

/** Pilihan urutan pustaka konten. "skor" memakai rumus yang sama dengan katalog publik. */
const urutanKonten = ["Terakhir diubah", "Skor rating (Bayesian)", "Ulasan terbanyak", "Judul A–Z"] as const;
type UrutanKonten = (typeof urutanKonten)[number];

export type ManagedRecipe = {
  id: number; slug: string; title: string; summary: string; category: string; status: string; image: string; images: string[]; price: string; priceValue: number; difficulty: string; rating: number; reviewCount: number; users: number; popularity: number; weather: string[]; water: string[]; waterBodies: string[]; fishingTypes: string[]; provinces: string[]; seasons: string[]; ingredients: { name: string; brand: string; amount: string; optional?: boolean }[]; steps: string[]; suitable: string[]; notSuitable: string[]; author: string; createdAt: string; updatedAt: string;
};

type IngredientRow = { name: string; brand: string; amount: string; optional: boolean };

type RecipeForm = {
  title: string; slug: string; summary: string; status: string; image: string; images: string; price: string; difficulty: string; weather: string; water: string; waterBodies: string; fishingTypes: string; provinces: string; seasons: string; ingredients: IngredientRow[]; steps: string[]; suitable: string; notSuitable: string; author: string;
};

const statuses = ["draft", "published", "archived"];
const statusFilters = ["Semua", "published", "draft", "archived"];
const blankForm: RecipeForm = {
  title: "", slug: "", summary: "", status: "draft", image: "", images: "",
  price: "", difficulty: "Mudah", weather: "", water: "", waterBodies: "Kolam",
  fishingTypes: "Harian", provinces: "", seasons: "",
  ingredients: [{ name: "", brand: "", amount: "", optional: false }],
  steps: [""],
  suitable: "", notSuitable: "", author: "Tim UMPAN MAS",
};

const fieldClass = "min-h-11 w-full rounded-xl border border-[#e2e8e1] bg-white px-3.5 text-sm text-[#344638] outline-none transition placeholder:text-[#969f94] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";
const areaClass = "min-h-24 w-full resize-y rounded-xl border border-[#e2e8e1] bg-white px-3.5 py-3 text-sm leading-6 text-[#344638] outline-none transition placeholder:text-[#969f94] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";
const chipClass = "!h-7 !px-2.5 !text-[10px]";

function listFrom(text: string) { return text.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean); }
function linesFrom(text: string) { return text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }

/** Baris bahan yang terisi lengkap (nama + takaran; merek opsional). */
function filledIngredients(rows: IngredientRow[]): Ingredient[] {
  return rows
    .map((row) => ({
      name: row.name.trim(),
      brand: row.brand.trim() === "-" ? "" : row.brand.trim(),
      amount: row.amount.trim(),
      optional: row.optional,
    }))
    .filter((row) => row.name && row.amount)
    .map((row) => ({ name: row.name, brand: row.brand, amount: row.amount, ...(row.optional ? { optional: true } : {}) }));
}

function formFromRecipe(recipe: ManagedRecipe): RecipeForm {
  return {
    title: recipe.title,
    slug: recipe.slug,
    summary: recipe.summary,
    status: recipe.status,
    image: recipe.image,
    images: (recipe.images?.length ? recipe.images : (recipe.image && recipe.image !== "/images/recipe-putih.jpg" ? [recipe.image] : [])).join("\n"),
    price: recipe.price && recipe.price !== BIAYA_BAWAAN_RESEP ? recipe.price : "",
    difficulty: recipe.difficulty || "Mudah",
    weather: recipe.weather.join(", "),
    water: recipe.water.join(", "),
    waterBodies: recipe.waterBodies.join(", "),
    fishingTypes: recipe.fishingTypes.join(", "),
    provinces: recipe.provinces.join(", "),
    seasons: recipe.seasons.join(", "),
    ingredients: recipe.ingredients.length
      ? recipe.ingredients.map((item) => ({
          name: item.name,
          brand: item.brand === "-" ? "" : item.brand,
          amount: item.amount,
          optional: Boolean(item.optional),
        }))
      : [{ name: "", brand: "", amount: "", optional: false }],
    steps: recipe.steps.length ? recipe.steps : [""],
    suitable: recipe.suitable.join("\n"),
    notSuitable: recipe.notSuitable.join("\n"),
    author: recipe.author,
  };
}

function toPayload(form: RecipeForm, status = form.status) {
  const labelBiaya = form.price.trim() || BIAYA_BAWAAN_RESEP;
  return {
    title: form.title.trim(),
    slug: form.slug.trim() || slugify(form.title),
    summary: form.summary.trim(),
    status,
    image: form.image,
    price: labelBiaya,
    priceValue: hargaAcuanDariLabel(labelBiaya),
    difficulty: form.difficulty || "Mudah",
    images: linesFrom(form.images),
    weather: listFrom(form.weather),
    water: listFrom(form.water),
    waterBodies: listFrom(form.waterBodies),
    fishingTypes: listFrom(form.fishingTypes),
    provinces: listFrom(form.provinces),
    seasons: listFrom(form.seasons),
    ingredients: filledIngredients(form.ingredients),
    steps: form.steps.map((s) => s.trim()).filter(Boolean),
    suitable: linesFrom(form.suitable),
    notSuitable: linesFrom(form.notSuitable),
    author: form.author.trim() || "Tim UMPAN MAS",
  };
}

function formattedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function Field({ label, hint, children, wide = false }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return <label className={`grid gap-1.5 text-xs font-bold text-[#4f5d50] ${wide ? "sm:col-span-2" : ""}`}><span>{label}</span>{children}{hint && <span className="text-[11px] font-medium leading-4 text-[#636d63]">{hint}</span>}</label>;
}

/**
 * Daftar bahan ringkas dalam satu kotak (selaras dengan form publik):
 * Nama bahan + Takaran wajib, Merek opsional, centang kecil Opsional bila perlu.
 */
function IngredientRowsEditor({ rows, onChange }: { rows: IngredientRow[]; onChange: (rows: IngredientRow[]) => void }) {
  const update = (index: number, patch: Partial<IngredientRow>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <div className="space-y-2.5">
      <ul className="grid gap-2">
        {rows.map((row, index) => (
          <li key={index} className="grid gap-2 rounded-xl border border-[#e9ece6] bg-[#fafbf9] p-2.5 sm:grid-cols-[26px_minmax(0,1.2fr)_minmax(0,.8fr)_minmax(0,1fr)_auto] sm:items-center">
            <span className="hidden h-7 w-7 place-items-center rounded-lg bg-[#eff4ec] text-[10px] font-bold text-[#4a634c] sm:grid">{String(index + 1).padStart(2, "0")}</span>
            <input className={fieldClass} value={row.name} maxLength={120} placeholder="Nama bahan (mis. Kroto)" aria-label={`Nama bahan ${index + 1}`} onChange={(event) => update(index, { name: event.target.value })} />
            <input className={fieldClass} value={row.amount} maxLength={120} placeholder="Takaran (mis. 1 ons)" aria-label={`Takaran bahan ${index + 1}`} onChange={(event) => update(index, { amount: event.target.value })} />
            <input className={fieldClass} value={row.brand} maxLength={120} placeholder="Merek (opsional)" aria-label={`Merek bahan ${index + 1}`} onChange={(event) => update(index, { brand: event.target.value })} />
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 px-1 text-xs font-bold text-[#4f5d50]">
                <input type="checkbox" checked={row.optional} onChange={(event) => update(index, { optional: event.target.checked })} className="h-4 w-4 accent-[#294b34]" /> Opsional
              </label>
              {rows.length > 1 && (
                <button type="button" aria-label={`Hapus baris bahan ${index + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}
                  className="grid h-9 w-9 place-items-center rounded-xl text-[#8a4433] transition hover:bg-[#fbefec]">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onChange([...rows, { name: "", brand: "", amount: "", optional: false }])}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#eef3ea] px-3.5 text-xs font-bold text-[#2f5b3a] transition hover:bg-[#e2ecdf]">
        <Plus size={14} /> Tambah bahan
      </button>
    </div>
  );
}

/** Daftar langkah bernomor; mendukung tempel teks multi-baris otomatis pecah jadi langkah. */
function StepsRowsEditor({ steps, onChange }: { steps: string[]; onChange: (steps: string[]) => void }) {
  function tempel(indeks: number, event: ClipboardEvent<HTMLTextAreaElement>) {
    const teks = event.clipboardData.getData("text");
    if (!teks.includes("\n")) return;
    const baris = teks.split(/\r?\n/).map((b) => b.replace(/^\d+\s*[.)]\s*/, "").trim()).filter(Boolean);
    if (baris.length <= 1) return;
    event.preventDefault();
    const awal = steps[indeks]?.trim();
    const sisipan = awal ? [`${awal} ${baris[0]}`.slice(0, 500), ...baris.slice(1).map((b) => b.slice(0, 500))] : baris.map((b) => b.slice(0, 500));
    onChange([...steps.slice(0, indeks), ...sisipan, ...steps.slice(indeks + 1)].slice(0, 40));
  }

  return (
    <div className="space-y-2.5">
      <div className="grid gap-2">
        {steps.map((langkah, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="mt-2.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#eef3ea] text-[11px] font-black text-[#2f5b3a]">{index + 1}</span>
            <textarea rows={2} maxLength={500} value={langkah} onPaste={(e) => tempel(index, e)}
              onChange={(event) => onChange(steps.map((s, i) => (i === index ? event.target.value : s)))}
              placeholder="Tulis satu langkah meracik…" aria-label={`Langkah ${index + 1}`}
              className="min-h-12 w-full resize-y rounded-xl border border-[#e2e8e1] bg-white px-3.5 py-2.5 text-sm leading-6 text-[#344638] outline-none transition placeholder:text-[#969f94] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10" />
            {steps.length > 1 && (
              <button type="button" aria-label={`Hapus langkah ${index + 1}`} onClick={() => onChange(steps.filter((_, i) => i !== index))}
                className="mt-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#8a4433] transition hover:bg-[#fbefec]">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...steps, ""])}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#eef3ea] px-3.5 text-xs font-bold text-[#2f5b3a] transition hover:bg-[#e2ecdf]">
        <Plus size={14} /> Tambah langkah
      </button>
    </div>
  );
}

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
      <button type="button" aria-pressed={semuaTerpilih} onClick={toggleSemua}
        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition ${semuaTerpilih ? "border-[#294b34] bg-[#294b34] text-white" : "border-dashed border-[#c9b458] bg-white text-[#7a5f14] hover:bg-[#fdf6e0]"}`}>
        {semuaTerpilih && <Check size={13} aria-hidden="true" />}Semua
      </button>
      {FISHING_TYPES.map((type) => {
        const aktif = terpilih.has(type);
        return (
          <button key={type} type="button" aria-pressed={aktif} onClick={() => toggle(type)}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition ${aktif ? "border-[#294b34] bg-[#294b34] text-white" : "border-[#e2e8e1] bg-[#f4f7f2] text-[#4b5b4e] hover:bg-[#e9efe6]"}`}>
            {aktif && <Check size={13} aria-hidden="true" />}{type}
          </button>
        );
      })}
    </div>
  );
}

function ConditionChipPicker({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string; onChange: (value: string) => void }) {
  const dipilih = listFrom(value);
  const semuaTerpilih = options.length > 0 && options.every((item) => dipilih.includes(item));
  const toggle = (item: string) => {
    const set = new Set(dipilih);
    if (set.has(item)) set.delete(item); else set.add(item);
    onChange(options.filter((opsi) => set.has(opsi)).join(", "));
  };
  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs font-bold text-[#4f5d50]">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.length > 1 && (
          <button type="button" aria-pressed={semuaTerpilih} onClick={() => onChange(semuaTerpilih ? "" : options.join(", "))}
            className={`min-h-9 rounded-full border px-3 text-xs font-bold transition ${semuaTerpilih ? "border-[#294b34] bg-[#294b34] text-white" : "border-dashed border-[#c9b458] bg-white text-[#7a5f14] hover:bg-[#fdf6e0]"}`}>
            Semua
          </button>
        )}
        {options.map((item) => {
          const aktif = dipilih.includes(item);
          return (
            <button key={item} type="button" aria-pressed={aktif} onClick={() => toggle(item)}
              className={`min-h-9 rounded-full border px-3 text-xs font-bold transition ${aktif ? "border-[#294b34] bg-[#294b34] text-white" : "border-[#e2e8e1] bg-white text-[#4b5b4e] hover:bg-[#eef3ea]"}`}>
              {item}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Dropdown banyak pilihan dengan pencarian (dipakai untuk daftar 38 provinsi).
 * Panel melayang di atas isi lain dan menutup saat klik luar atau Escape.
 */
function MultiSelectDropdown({ value, options, onChange, placeholder, searchable = false }: {
  value: string; options: readonly string[]; onChange: (value: string) => void; placeholder: string; searchable?: boolean;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const [kata, setKata] = useState("");
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
  const semuaTerpilih = options.length > 0 && options.every((item) => terpilih.includes(item));
  const toggleSemua = () => onChange(semuaTerpilih ? "" : semuaPilihan.join(", "));
  return (
    <div ref={akarRef} className="relative">
      <button type="button" aria-expanded={terbuka} aria-haspopup="true" onClick={() => setTerbuka((sebelum) => !sebelum)} className={`${fieldClass} flex items-center justify-between gap-2 text-left`}>
        <span className={`truncate ${terpilih.length ? "font-semibold" : "font-medium text-[#636d63]"}`}>{terpilih.length ? terpilih.join(", ") : placeholder}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {terpilih.length > 0 && <span className="rounded-full bg-[#eef5ea] px-2 py-0.5 text-[10px] font-extrabold text-[#33523a]">{terpilih.length}</span>}
          <ChevronDown size={15} aria-hidden="true" className={`text-[#626d63] transition ${terbuka ? "rotate-180" : ""}`} />
        </span>
      </button>
      {terbuka && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-xl border border-[#e2e8e1] bg-white p-1.5 shadow-[0_16px_40px_rgba(36,53,39,.16)]">
          {searchable && <input value={kata} onChange={(event) => setKata(event.target.value)} placeholder="Cari provinsi…" aria-label="Cari provinsi" className="mb-1.5 min-h-9 w-full rounded-lg border border-[#e8ece5] bg-[#fbfcfa] px-3 text-xs font-medium text-[#344638] outline-none placeholder:text-[#969f94] focus:border-[#748f70]" />}
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
            )) : <p className="px-2.5 py-2 text-[11px] font-medium text-[#636d63]">Tidak ada pilihan yang cocok.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Pratinjau memakai komponen yang sama dengan halaman publik. */
function RecipePreview({ form }: { form: RecipeForm }) {
  const [fotoSorot, setFotoSorot] = useState<string | null>(null);
  const daftarFoto = linesFrom(form.images);
  const gambarUtama = form.image || daftarFoto[0] || "/images/recipe-putih.jpg";
  const gambarAktif = fotoSorot && daftarFoto.includes(fotoSorot) ? fotoSorot : gambarUtama;
  const perluUnoptimized = (url: string) => url.startsWith("blob:") || url.startsWith("/api/media/");

  const ingredients = filledIngredients(form.ingredients);
  const steps = form.steps.map((s) => s.trim()).filter(Boolean);
  const kategori = primaryFishingType(form.title, listFrom(form.fishingTypes));
  const cuaca = listFrom(form.weather);
  const air = listFrom(form.water);
  const informasi = [
    { label: "Target", value: "Ikan mas", icon: Fish },
    ...(cuaca.length ? [{ label: "Cuaca", value: cuaca.slice(0, 2).join(" · "), icon: CloudRain }] : []),
    ...(air.length ? [{ label: "Kondisi air", value: air.join(" · "), icon: Droplets }] : []),
    { label: "Jenis kolam", value: listFrom(form.fishingTypes).join(" · ") || "Harian", icon: Waves },
    { label: "Budget", value: form.price.trim() || BIAYA_BAWAAN_RESEP, icon: Wallet },
    { label: "Kesulitan", value: form.difficulty || "Mudah", icon: Gauge },
  ];

  return (
    <div className="grid gap-6">
      <p className="rounded-xl border border-[#dbe8d7] bg-[#f0f6ed] px-4 py-3 text-[11px] leading-5 font-semibold text-[#436444]">
        Pratinjau ini sama persis dengan tampilan pengunjung di halaman publik.
      </p>
      <section className="overflow-hidden rounded-[22px] border border-[#e5e9e2] bg-white">
        <div className="relative aspect-square w-full bg-[#e4e3d6]">
          <Image src={gambarAktif} alt={form.title.trim() ? `Foto pratinjau ${form.title.trim()}` : "Foto pratinjau resep"} fill sizes="640px" unoptimized={perluUnoptimized(gambarAktif)} className="object-cover" />
          <span className="absolute bottom-3 left-3 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-[#3a513d] backdrop-blur-sm">{kategori} · Ikan mas</span>
        </div>
        {daftarFoto.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-b border-[#eef0ec] p-3">
            {daftarFoto.map((url, idx) => (
              <button key={url} type="button" onClick={() => setFotoSorot(url)} aria-label={`Lihat foto pratinjau ${idx + 1}`}
                className={`relative aspect-square h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#edf1ea] transition ${url === gambarAktif ? "ring-2 ring-[#294b34] ring-offset-1" : "opacity-75 hover:opacity-100"}`}>
                <Image src={url} alt="" fill sizes="56px" unoptimized={perluUnoptimized(url)} className="object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="p-4 sm:p-5">
          <h3 className="break-words text-xl font-black tracking-[-.03em] text-[#213426]">{form.title || "Judul resep"}</h3>
          <p className="mt-2 break-words text-xs leading-5 text-[#636d63]">{form.summary || "Cerita singkat resep tampil di sini."}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {informasi.map(({ label, value, icon: Icon }) => (
              <div key={label} className="min-w-0 rounded-xl border border-[#edf0eb] bg-[#fafbf8] p-2.5">
                <Icon size={14} className="text-[#5c705c]" />
                <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[.1em] text-[#666e65]">{label}</p>
                <p className="mt-0.5 break-words text-[11px] font-bold leading-4 text-[#405142]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {ingredients.length > 0 ? (
        <IngredientTable ingredients={ingredients} />
      ) : (
        <p className="rounded-[22px] border border-dashed border-[#d9e0d5] bg-[#fafbf8] p-4 text-xs leading-5 text-[#636d63]">
          Tambahkan bahan di formulir untuk melihat tabel takaran di sini.
        </p>
      )}
      {steps.length > 0 ? (
        <PreparationSteps steps={steps} />
      ) : (
        <p className="rounded-[22px] border border-dashed border-[#d9e0d5] bg-[#fafbf8] p-4 text-xs leading-5 text-[#636d63]">
          Tambahkan langkah meracik di formulir untuk melihat urutan langkah di sini.
        </p>
      )}
      <ConditionTags suitable={linesFrom(form.suitable)} notSuitable={linesFrom(form.notSuitable)} />
    </div>
  );
}

function RecipeEditor({ recipe, onClose, onSave, readOnly = false }: { recipe?: ManagedRecipe; onClose: () => void; onSave: (payload: ReturnType<typeof toPayload>, id?: number) => Promise<void>; readOnly?: boolean }) {
  const [form, setForm] = useState<RecipeForm>(recipe ? formFromRecipe(recipe) : blankForm);
  const [tab, setTab] = useState<"formulir" | "pratinjau">("formulir");
  const [ubahUrl, setUbahUrl] = useState(false);
  const [slugManual, setSlugManual] = useState(Boolean(recipe));
  const [detailTerbuka, setDetailTerbuka] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = <K extends keyof RecipeForm>(key: K, value: RecipeForm[K]) =>
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "title" && !slugManual && typeof value === "string" ? { slug: slugify(value) } : {}),
    }));

  // Provinsi pada resep baru hanya diisi otomatis bila lokasi diizinkan; tanpa fallback.
  const terapkanLokasi = useCallback((place: { province: string }) => {
    if (recipe) return;
    setForm((cur) => (listFrom(cur.provinces).length ? cur : { ...cur, provinces: place.province }));
  }, [recipe]);
  const { markTouched: tandaiProvinsiDiubah } = useLocationAutofill(terapkanLokasi);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [fotoBaru, setFotoBaru] = useState<{ file: File; url: string }[]>([]);
  const [thumbnailBaru, setThumbnailBaru] = useState<number | null>(null);
  const fotoBaruUrls = useRef<string[]>([]);
  const galeri = linesFrom(form.images);
  const totalFoto = galeri.length + fotoBaru.length;

  useEffect(() => () => { fotoBaruUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  function aturGaleri(urls: string[], thumbnail?: string) {
    setForm((current) => ({
      ...current,
      images: urls.join("\n"),
      image: thumbnail ?? (urls.includes(current.image) ? current.image : (urls[0] ?? "/images/recipe-putih.jpg")),
    }));
  }

  async function tambahFotoBaru(files: File[]) {
    const dipilih = files.slice(0, Math.max(0, 5 - totalFoto));
    setPhotoError(dipilih.length < files.length ? "Satu resep maksimal 5 foto. Hapus foto lain dulu." : "");
    if (!dipilih.length) return;
    setPhotoBusy(true);
    try {
      const baru = await Promise.all(dipilih.map(async (file) => {
        const hasil = await kompresGambar(file, { lebarMaks: 1280, targetBytes: 200_000 });
        return { file: hasil.file, url: URL.createObjectURL(hasil.file) };
      }));
      baru.forEach((item) => fotoBaruUrls.current.push(item.url));
      setFotoBaru((cur) => [...cur, ...baru].slice(0, Math.max(0, 5 - galeri.length)));
    } finally {
      setPhotoBusy(false);
    }
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

  const semuaFotoPratinjau = [...galeri, ...fotoBaru.map((item) => item.url)];
  const fotoUtamaUrl =
    (thumbnailBaru !== null && fotoBaru[thumbnailBaru]?.url) ||
    (form.image && galeri.includes(form.image) ? form.image : "") ||
    galeri[0] ||
    fotoBaru[0]?.url ||
    "";

  const formPratinjau: RecipeForm = {
    ...form,
    image: fotoUtamaUrl,
    images: semuaFotoPratinjau.join("\n"),
  };

  const bahanMulai = form.ingredients.filter((b) => b.name.trim() || b.amount.trim() || b.brand.trim());
  const ingredients = filledIngredients(form.ingredients);
  const stepsBersih = form.steps.map((s) => s.trim()).filter(Boolean);
  const slugTampil = form.slug.trim() || slugify(form.title) || "judul-resep";

  const provinsiTerpilih = listFrom(form.provinces);
  const cuacaTerpilih = listFrom(form.weather);
  const airTerpilih = listFrom(form.water);
  const ringkasanOpsional = [
    provinsiTerpilih.length ? (provinsiTerpilih.length === 1 ? provinsiTerpilih[0] : `${provinsiTerpilih.length} provinsi`) : "",
    cuacaTerpilih.length ? cuacaTerpilih.slice(0, 2).join(", ") : "",
    airTerpilih.length ? `Air ${airTerpilih.slice(0, 2).join(", ").toLowerCase()}` : "",
    form.price.trim() ? PILIHAN_BIAYA_CEPAT.find((b) => b.value === form.price.trim())?.label ?? form.price.trim() : "",
  ].filter(Boolean);

  function periksaWajib(): string | null {
    if (form.title.trim().length < 3) return "Judul minimal 3 karakter.";
    if (form.summary.trim().length < 10) return "Cerita singkat minimal 10 karakter (1–2 kalimat singkat).";
    if (listFrom(form.fishingTypes).length === 0) return "Pilih minimal satu jenis kolam untuk resep ini.";
    if (!ingredients.length || bahanMulai.some((b) => !b.name.trim() || !b.amount.trim())) return "Lengkapi nama dan takaran pada setiap bahan (merek boleh kosong).";
    if (stepsBersih.length === 0) return "Tambahkan minimal satu langkah meracik.";
    return null;
  }

  async function simpan(statusTarget = form.status) {
    setError("");
    const pesan = periksaWajib();
    if (pesan) { setError(pesan); return; }
    setBusy(true);
    try { await onSave(await siapkanPayload(statusTarget), recipe?.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Konten gagal disimpan."); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await simpan(form.status);
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#16251b]/55 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="recipe-editor-title" className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-[25px] bg-[#f9faf8] shadow-2xl sm:rounded-[25px]">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#e7ebe4] bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-[#656d64]">Content Studio / Resep</p>
            <h2 id="recipe-editor-title" className="mt-1 text-lg font-black text-[#2b3c2e]">{recipe ? "Edit resep" : "Tulis resep baru"}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-[#eff3ec] p-1" role="tablist" aria-label="Mode editor">
              {([["formulir", "Formulir"], ["pratinjau", "Pratinjau"]] as const).map(([value, label]) => (
                <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition ${tab === value ? "bg-white text-[#315a39] shadow-sm" : "text-[#626e61]"}`}>
                  {value === "pratinjau" && <Eye size={13} />}{label}
                </button>
              ))}
            </div>
            <button type="button" aria-label="Tutup editor" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[#f0f3ed] text-[#536253] hover:bg-[#e5ebe2]"><X size={17} /></button>
          </div>
        </div>

        <form onSubmit={submit} noValidate={tab !== "formulir"}>
          <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
            <div className={tab === "pratinjau" ? "hidden" : "space-y-4 p-4 sm:p-6"}>
              <section className="space-y-4 rounded-2xl border border-[#e7ebe5] bg-white p-4 sm:p-5">
                <div>
                  <Field label="Judul racikan">
                    <input autoFocus className={fieldClass} value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={180} placeholder="Mis. Umpan Jagung Kukus Andalan" />
                  </Field>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#636d63]">
                    <span className="truncate">URL: <code className="font-semibold text-[#3f5542]">/resep/{slugTampil}</code></span>
                    <button type="button" onClick={() => setUbahUrl((cur) => !cur)} className="font-bold text-[#31593a] underline-offset-2 hover:underline">
                      {ubahUrl ? "Sembunyikan URL" : "Ubah URL"}
                    </button>
                  </div>
                  {ubahUrl && (
                    <div className="mt-2">
                      <input className={fieldClass} value={form.slug} aria-label="Slug URL"
                        onChange={(event) => {
                          const bersih = slugify(event.target.value);
                          setSlugManual(Boolean(bersih));
                          setForm((cur) => ({ ...cur, slug: bersih }));
                        }}
                        maxLength={180} placeholder="slug-resep" />
                    </div>
                  )}
                </div>

                <div className="grid gap-1.5 text-xs font-bold text-[#4f5d50]">
                  <span>Foto racikan <span className="font-medium text-[#636d63]">(opsional, {totalFoto}/5 foto · persegi 1:1)</span></span>
                  {totalFoto > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {galeri.map((url) => {
                        const adalahUtama = url === fotoUtamaUrl;
                        return (
                          <div key={url} className={`relative aspect-square overflow-hidden rounded-xl border border-[#e8ece5] bg-[#edf1ea] ${adalahUtama ? "ring-2 ring-[#294b34] ring-offset-1" : ""}`}>
                            <Image src={url} alt="" fill sizes="120px" unoptimized={url.startsWith("/api/media/")} className="object-cover" />
                            {adalahUtama && <span className="absolute left-1.5 top-1.5 rounded-full bg-[#16251b]/80 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-white">Thumbnail</span>}
                            <span className="absolute inset-x-1.5 bottom-1.5 flex gap-1">
                              <button type="button" disabled={photoBusy || adalahUtama} onClick={() => { aturGaleri(galeri, url); setThumbnailBaru(null); }} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-white/95 px-1.5 text-[9px] font-extrabold text-[#315a39] shadow-sm transition hover:bg-white disabled:opacity-60">
                                <Check size={11} /> Utama
                              </button>
                              <button type="button" disabled={photoBusy} onClick={() => hapusFoto(url)} aria-label="Hapus foto" className="grid h-7 w-7 place-items-center rounded-lg bg-white/95 text-[#8a4433] shadow-sm transition hover:bg-white disabled:opacity-60">
                                <Trash2 size={12} />
                              </button>
                            </span>
                          </div>
                        );
                      })}
                      {fotoBaru.map((item, indeks) => {
                        const adalahUtama = item.url === fotoUtamaUrl;
                        return (
                          <div key={item.url} className={`relative aspect-square overflow-hidden rounded-xl border border-[#e8ece5] bg-[#edf1ea] ${adalahUtama ? "ring-2 ring-[#294b34] ring-offset-1" : ""}`}>
                            <Image src={item.url} alt="" fill sizes="120px" unoptimized className="object-cover" />
                            <span className="absolute right-1.5 top-1.5 rounded-full bg-white/85 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-[#5c6a5c]">Baru</span>
                            {adalahUtama && <span className="absolute left-1.5 top-1.5 rounded-full bg-[#16251b]/80 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-white">Thumbnail</span>}
                            <span className="absolute inset-x-1.5 bottom-1.5 flex gap-1">
                              <button type="button" disabled={photoBusy || adalahUtama} onClick={() => setThumbnailBaru(indeks)} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-white/95 px-1.5 text-[9px] font-extrabold text-[#315a39] shadow-sm transition hover:bg-white disabled:opacity-60">
                                <Check size={11} /> Utama
                              </button>
                              <button type="button" disabled={photoBusy} onClick={() => hapusFotoBaru(indeks)} aria-label="Hapus foto" className="grid h-7 w-7 place-items-center rounded-lg bg-white/95 text-[#8a4433] shadow-sm transition hover:bg-white disabled:opacity-60">
                                <Trash2 size={12} />
                              </button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" aria-label="Pilih berkas foto racikan"
                      onChange={(event) => { const files = event.target.files ? [...event.target.files] : []; event.target.value = ""; if (files.length) void tambahFotoBaru(files); }} />
                    <button type="button" disabled={photoBusy || totalFoto >= 5} onClick={() => photoInputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#eef3ea] px-4 text-xs font-extrabold text-[#2f5b3a] transition hover:bg-[#e2ecdf] disabled:opacity-60">
                      {photoBusy ? <Loader2 size={15} className="animate-spin" /> : <ImageUp size={15} />} {totalFoto ? "Tambah foto" : "Pilih foto"}
                    </button>
                    {totalFoto > 0 && (
                      <button type="button" disabled={photoBusy} onClick={pakaiFotoBawaan} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-3.5 text-xs font-bold text-[#636e63] transition hover:bg-[#f6f8f5] disabled:opacity-50">
                        <RotateCcw size={14} /> Pakai foto bawaan
                      </button>
                    )}
                    <span className="text-[11px] font-medium text-[#636d63]">Otomatis dikompres ≤200 KB & diunggah saat resep disimpan.</span>
                  </div>
                  {photoError && <p role="alert" className="text-[11px] font-semibold leading-4 text-[#a4442f]">{photoError}</p>}
                </div>

                <Field label="Cerita singkat">
                  <textarea rows={3} className={areaClass} value={form.summary} onChange={(event) => update("summary", event.target.value)} maxLength={1500} placeholder="Tulis 1–2 kalimat singkat tentang karakter atau keunggulan racikan ini." />
                </Field>

                <div className="grid gap-1.5 text-xs font-bold text-[#4f5d50]">
                  <span>Jenis kolam <span className="font-medium text-[#636d63]">(pilih minimal satu)</span></span>
                  <FishingTypePicker value={form.fishingTypes} onChange={(value) => update("fishingTypes", value)} />
                </div>

                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#4f5d50]">Bahan-bahan <span className="font-medium text-[#636d63]">(merek boleh kosong)</span></span>
                    {ingredients.length > 0 && <Badge tone="sage">{ingredients.length} bahan siap</Badge>}
                  </div>
                  <IngredientRowsEditor rows={form.ingredients} onChange={(rows) => update("ingredients", rows)} />
                </div>

                <div className="grid gap-2">
                  <span className="text-xs font-bold text-[#4f5d50]">Cara meracik</span>
                  <StepsRowsEditor steps={form.steps} onChange={(rows) => update("steps", rows)} />
                </div>
              </section>

              <section className="rounded-2xl border border-[#e3e9df] bg-white">
                <button type="button" aria-expanded={detailTerbuka} onClick={() => setDetailTerbuka((cur) => !cur)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-[#2f4534]">
                      {detailTerbuka ? "Sembunyikan kondisi & daerah" : "+ Lengkapi kondisi & daerah (opsional)"}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[#616d61]">
                      {ringkasanOpsional.length ? ringkasanOpsional.join(" · ") : "Cuaca, kondisi air, provinsi, perkiraan biaya, dan penulis"}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    {ringkasanOpsional.length > 0 && <span className="rounded-full bg-[#e8f0e4] px-2.5 py-0.5 text-[10px] font-extrabold text-[#31593a]">{ringkasanOpsional.length} terisi</span>}
                    <ChevronDown size={16} aria-hidden="true" className={`text-[#5a695b] transition ${detailTerbuka ? "rotate-180" : ""}`} />
                  </span>
                </button>

                {detailTerbuka && (
                  <div className="space-y-4 border-t border-[#eef1ec] p-4 sm:p-5">
                    <ConditionChipPicker label="Cuaca yang cocok" options={WEATHER_CONDITIONS} value={form.weather} onChange={(value) => update("weather", value)} />
                    <ConditionChipPicker label="Kondisi air yang cocok" options={WATER_CONDITIONS} value={form.water} onChange={(value) => update("water", value)} />

                    <div className="grid gap-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#4f5d50]">Provinsi asal / yang cocok</span>
                        <UseMyLocationButton
                          label="Isi dari lokasi"
                          onPlace={(place) => {
                            tandaiProvinsiDiubah();
                            const cur = listFrom(form.provinces);
                            if (!cur.includes(place.province)) update("provinces", [...cur, place.province].join(", "));
                          }}
                          onForget={() => {
                            tandaiProvinsiDiubah();
                            update("provinces", "");
                          }}
                        />
                      </div>
                      <MultiSelectDropdown
                        value={form.provinces}
                        options={provinces.map((province) => province.name)}
                        onChange={(value) => { tandaiProvinsiDiubah(); update("provinces", value); }}
                        placeholder="Pilih provinsi (opsional)…"
                        searchable
                      />
                    </div>

                    <fieldset>
                      <legend className="mb-1.5 block text-xs font-bold text-[#4f5d50]">Perkiraan biaya bahan</legend>
                      <div className="flex flex-wrap gap-2">
                        {PILIHAN_BIAYA_CEPAT.map((opsi) => {
                          const aktif = form.price === opsi.value;
                          return (
                            <button key={opsi.value} type="button" aria-pressed={aktif}
                              onClick={() => update("price", aktif ? "" : opsi.value)}
                              className={`min-h-9 rounded-full border px-3.5 text-xs font-bold transition ${aktif ? "border-[#294b34] bg-[#294b34] text-white" : "border-[#e2e8e1] bg-white text-[#4b5b4e] hover:bg-[#eef3ea]"}`}>
                              {opsi.label}
                            </button>
                          );
                        })}
                      </div>
                      {form.price && !PILIHAN_BIAYA_CEPAT.some((opsi) => opsi.value === form.price) && (
                        <p className="mt-1.5 text-[11px] text-[#616d61]">Biaya tersimpan saat ini: <strong>{form.price}</strong></p>
                      )}
                    </fieldset>

                    <div className="grid gap-3 border-t border-[#eef1ec] pt-3 sm:grid-cols-2">
                      <Field label="Penulis">
                        <input className={fieldClass} value={form.author} onChange={(event) => update("author", event.target.value)} maxLength={100} />
                      </Field>
                      <Field label="Status konten">
                        <select className={fieldClass} value={form.status} onChange={(event) => update("status", event.target.value)}>
                          {statuses.map((item) => <option key={item} value={item}>{item === "published" ? "Published · tampil publik" : item === "draft" ? "Draft · hanya admin" : "Archived · disimpan"}</option>)}
                        </select>
                      </Field>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {tab === "pratinjau" && (
              <div className="space-y-4 p-4 sm:p-6">
                <p className="flex items-center gap-2 rounded-xl border border-[#dbe8d7] bg-[#f0f6ed] px-4 py-3 text-[11px] font-semibold text-[#436444]"><Eye size={14} /> Mode pratinjau — perubahan belum disimpan.</p>
                <RecipePreview form={formPratinjau} />
              </div>
            )}
            {error && <p role="alert" className="mx-4 mb-2 rounded-xl border border-[#efdcd5] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold leading-5 text-[#9c513e] sm:mx-6">{error}</p>}
          </fieldset>

          <div className="sticky bottom-0 flex flex-col-reverse justify-between gap-2 border-t border-[#e6eae4] bg-[#f9faf8]/95 px-4 py-3 backdrop-blur sm:flex-row sm:px-6">
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#636e63]">Batal</button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setTab(tab === "pratinjau" ? "formulir" : "pratinjau")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dce4d9] bg-white px-4 text-xs font-bold text-[#456047] hover:bg-[#f3f6f0]"><Eye size={14} /> {tab === "pratinjau" ? "Kembali ke formulir" : "Lihat pratinjau"}</button>
              {recipe && form.status === "published" ? (
                <>
                  <button type="button" disabled={busy || readOnly} onClick={() => void simpan("draft")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dce4d9] bg-white px-4 text-xs font-bold text-[#456047] hover:bg-[#f3f6f0] disabled:opacity-60">Jadikan draft</button>
                  <button type="submit" disabled={busy || readOnly} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-xs font-bold text-white hover:bg-[#203d29] disabled:opacity-60"><Check size={14} /> {busy ? "Menyimpan…" : "Simpan perubahan"}</button>
                </>
              ) : (
                <>
                  <button type="submit" disabled={busy || readOnly} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dce4d9] bg-white px-4 text-xs font-bold text-[#456047] hover:bg-[#f3f6f0] disabled:opacity-60"><Check size={14} /> {busy ? "Menyimpan…" : form.status === "archived" ? "Simpan arsip" : "Simpan draft"}</button>
                  <button type="button" disabled={busy || readOnly} onClick={() => void simpan("published")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-xs font-bold text-white hover:bg-[#203d29] disabled:opacity-60"><Send size={14} /> {recipe ? "Publikasikan" : "Tayangkan langsung"}</button>
                </>
              )}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

export function ContentManager() {
  const me = useAdminMe();
  // Peran tanpa kapabilitas konten (mis. Hanya-lihat/Moderator): semua kontrol
  // ubah dinonaktifkan dan editor tidak dibuka. Server tetap penegak utama.
  const readOnly = !adminCan(me, "konten");
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
          <button type="button" disabled={readOnly} title={readOnly ? "Peran Anda hanya dapat melihat menu ini" : undefined} onClick={() => { setEditing(undefined); setEditorOpen(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> Tulis resep</button>
        </div>
      </div>

      {readOnly && me && (
        <p role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-[#e9e4cf] bg-[#fbf7e8] px-4 py-3 text-xs leading-5 text-[#7a6535]"><Eye size={15} className="mt-0.5 shrink-0" /><span><strong>Mode hanya-lihat.</strong> Peran Anda ({me.roleLabel}) dapat melihat isi menu ini, tetapi tidak dapat mengubah apa pun — tombol tambah, edit, dan hapus dinonaktifkan.</span></p>
      )}

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
            <button type="button" onClick={() => excelInputRef.current?.click()} disabled={importingExcel || readOnly} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#c9d8c5] bg-white px-5 text-xs font-extrabold text-[#3c5a41] transition hover:bg-[#eef4ea] disabled:opacity-60"><FileSpreadsheet size={16} aria-hidden="true" />{importingExcel ? "Mengimpor…" : "Upload Excel"}</button>
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
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#edf1ea]"><Image src={item.image || "/images/recipe-putih.jpg"} alt="" fill sizes="48px" unoptimized={Boolean(item.image?.startsWith("/api/media/"))} className="object-cover" /></span>
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
                        <button type="button" disabled={readOnly} title={readOnly ? "Mode hanya-lihat" : undefined} onClick={() => { setEditing(item); setEditorOpen(true); }} aria-label={`Edit ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#5f6f5e] (4.59:1 terburuk) hover:bg-[#edf3e9] hover:text-[#345b3a] disabled:cursor-not-allowed disabled:opacity-40"><FilePenLine size={14} /></button>
                        {item.status !== "published" ? (
                          <button type="button" onClick={() => void changeStatus(item, "published")} disabled={pending === item.id || readOnly} aria-label={`Publikasikan ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#517250] (4.65:1 terburuk) hover:bg-[#edf3e9] disabled:opacity-40"><Globe2 size={14} /></button>
                        ) : (
                          <button type="button" onClick={() => void changeStatus(item, "draft")} disabled={pending === item.id || readOnly} aria-label={`Jadikan ${item.title} draft`} className="grid h-8 w-8 place-items-center rounded-lg text-[#7b693f] (4.58:1 terburuk) hover:bg-[#f8f4e9] disabled:opacity-40"><FilePenLine size={14} /></button>
                        )}
                        <button type="button" onClick={() => void remove(item)} disabled={pending === item.id || readOnly} aria-label={`Hapus ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#905f50] (4.57:1 terburuk) hover:bg-[#fbefec] disabled:opacity-40"><Trash2 size={14} /></button>
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
              <button type="button" disabled={readOnly} onClick={() => { setEditing(undefined); setEditorOpen(true); }} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Plus size={14} /> Buat resep pertama <ArrowRight size={13} /></button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef0ec] bg-[#fafbf9] px-4 py-3 text-[9px] text-[#959c93] sm:px-5">
          <span>Database PostgreSQL · perubahan langsung</span>
          <span className="inline-flex items-center gap-1"><ChevronDown size={12} /> {items.length} resep</span>
        </div>
      </section>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#edf2e9] px-4 py-3 text-[10px] leading-5 text-[#626e62] (4.59:1 terburuk)"><Globe2 size={13} className="mt-0.5 shrink-0" />Status <strong>Published</strong> membuat resep tersedia di katalog publik. Draft dan arsip hanya tampil di dashboard.</div>

      {editorOpen && !readOnly && <RecipeEditor key={editing?.id ?? "new"} recipe={editing} readOnly={readOnly} onClose={() => { setEditorOpen(false); setEditing(undefined); router.replace("/dashboard/konten"); }} onSave={save} />}
    </AdminShell>
  );
}
