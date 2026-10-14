"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, CirclePlus, CloudRain, Database, Droplets, Eye, FilePenLine, Fish, Gauge, Globe2, ListChecks, Plus, Search, Send, Trash2, Wallet, Waves, X } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/shared";
import { ConditionTags, IngredientTable, PreparationSteps } from "@/components/recipe-details";
import { recipes as seedRecipes, type Ingredient } from "@/data/recipes";
import { slugify } from "@/lib/utils";

export type ManagedRecipe = {
  id: number; slug: string; title: string; summary: string; category: string; status: string; image: string; price: string; priceValue: number; difficulty: string; rating: number; reviewCount: number; users: number; popularity: number; weather: string[]; water: string[]; fishingTypes: string[]; provinces: string[]; seasons: string[]; ingredients: { name: string; brand: string; amount: string; optional?: boolean }[]; steps: string[]; suitable: string[]; notSuitable: string[]; author: string; createdAt: string; updatedAt: string;
};

/** Satu baris bahan di editor: bentuknya sama dengan yang tampil di halaman publik. */
type IngredientRow = { name: string; brand: string; amount: string; optional: boolean };

type RecipeForm = {
  title: string; slug: string; summary: string; category: string; status: string; image: string; price: string; priceValue: string; difficulty: string; weather: string; water: string; fishingTypes: string; provinces: string; seasons: string; ingredients: IngredientRow[]; steps: string; suitable: string; notSuitable: string; author: string;
};

const categoryOptions = ["Harian", "Lomba", "Galatama", "Premium", "Ekonomis"];
const statuses = ["draft", "published", "archived"];
const statusFilters = ["Semua", "published", "draft", "archived"];
const imageOptions = [
  { value: "/images/recipe-putih.jpg", label: "Umpan putih · kroto" },
  { value: "/images/recipe-pelet.jpg", label: "Pelet · pandan" },
  { value: "/images/recipe-jagung.jpg", label: "Jagung · kroto" },
];

const blankForm: RecipeForm = {
  title: "", slug: "", summary: "", category: "Harian", status: "draft", image: "/images/recipe-putih.jpg",
  price: "Rp15.000–30.000", priceValue: "20000", difficulty: "Mudah", weather: "Hujan, Mendung", water: "Keruh",
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
    title: recipe.title, slug: recipe.slug, summary: recipe.summary, category: recipe.category, status: recipe.status, image: recipe.image,
    price: recipe.price, priceValue: String(recipe.priceValue), difficulty: recipe.difficulty, weather: recipe.weather.join(", "),
    water: recipe.water.join(", "), fishingTypes: recipe.fishingTypes.join(", "), provinces: recipe.provinces.join(", "),
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
    priceValue: Number(form.priceValue),
    weather: listFrom(form.weather),
    water: listFrom(form.water),
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
  return <label className={`grid gap-1.5 text-xs font-bold text-[#657164] ${wide ? "sm:col-span-2" : ""}`}><span>{label}</span>{children}{hint && <span className="text-[10px] font-medium leading-4 text-[#959c93]">{hint}</span>}</label>;
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
    { key: true, title: "Tambahan opsional", note: "Boleh dilewati; tidak dihitung sebagai pembeda di pencarian dan Sistem Pakar." },
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
                    <span className="hidden h-7 w-7 place-items-center rounded-lg bg-[#eff4ec] text-[10px] font-bold text-[#668068] sm:grid">{String(order + 1).padStart(2, "0")}</span>
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
                        className="grid h-9 w-9 place-items-center rounded-xl text-[#a26b5b] transition hover:bg-[#fbefec]">
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

/** Pratinjau memakai komponen yang sama dengan halaman publik, jadi tidak mungkin berbeda. */
function RecipePreview({ form }: { form: RecipeForm }) {
  const ingredients = filledIngredients(form.ingredients);
  const steps = listFrom(form.steps);
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
        <div className="relative h-44 w-full bg-[#e4e3d6]">
          {form.image && <Image src={form.image} alt="" fill unoptimized sizes="640px" className="object-cover" />}
          <span className="absolute bottom-3 left-3 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-[#3a513d] backdrop-blur-sm">{form.category} · Ikan mas</span>
        </div>
        <div className="p-4 sm:p-5">
          <h3 className="break-words text-xl font-black tracking-[-.03em] text-[#213426]">{form.title || "Judul resep"}</h3>
          <p className="mt-2 break-words text-xs leading-5 text-[#758075]">{form.summary || "Ringkasan resep tampil di sini."}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {informasi.map(({ label, value, icon: Icon }) => (
              <div key={label} className="min-w-0 rounded-xl border border-[#edf0eb] bg-[#fafbf8] p-2.5">
                <Icon size={14} className="text-[#6d856d]" />
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

  const ingredients = filledIngredients(form.ingredients);
  const optionalCount = ingredients.filter((item) => item.optional).length;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (ingredients.length === 0) { setError("Tambahkan minimal satu bahan: isi nama dan takarannya."); return; }
    if (listFrom(form.steps).length === 0) { setError("Tambahkan setidaknya satu langkah persiapan."); return; }
    setBusy(true);
    try { await onSave(toPayload(form), recipe?.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Konten gagal disimpan."); }
    finally { setBusy(false); }
  }

  async function publish(status: string) {
    setError("");
    if (form.title.trim().length < 3 || form.summary.trim().length < 15) { setError("Lengkapi judul dan ringkasan sebelum mengganti status."); return; }
    if (ingredients.length === 0) { setError("Tambahkan minimal satu bahan: isi nama dan takarannya."); return; }
    setBusy(true);
    try { await onSave(toPayload(form, status), recipe?.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Konten gagal disimpan."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#16251b]/55 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="recipe-editor-title" className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-[25px] bg-[#f9faf8] shadow-2xl sm:rounded-[25px]">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#e7ebe4] bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-[#899488]">Content Studio / Resep</p>
            <h2 id="recipe-editor-title" className="mt-1 text-lg font-black text-[#2b3c2e]">{recipe ? "Edit resep" : "Tulis resep baru"}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-[#eff3ec] p-1" role="tablist" aria-label="Mode editor">
              {([["formulir", "Formulir"], ["pratinjau", "Pratinjau"]] as const).map(([value, label]) => (
                <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition ${tab === value ? "bg-white text-[#315a39] shadow-sm" : "text-[#6d7a6c]"}`}>
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
                <Field label="Judul resep"><input autoFocus className={fieldClass} value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={180} minLength={3} placeholder="Contoh: Umpan Putih Kroto" required /></Field>
                <Field label="Slug URL" hint="Alamat halaman detail. Harus unik."><input className={fieldClass} value={form.slug} onChange={(event) => update("slug", slugify(event.target.value))} maxLength={180} placeholder="umpan-putih-kroto" required /></Field>
                <Field label="Kategori"><select className={fieldClass} value={form.category} onChange={(event) => update("category", event.target.value)}>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Status konten"><select className={fieldClass} value={form.status} onChange={(event) => update("status", event.target.value)}>{statuses.map((item) => <option key={item} value={item}>{item === "published" ? "Published · tampil publik" : item === "draft" ? "Draft · hanya admin" : "Archived · disimpan"}</option>)}</select></Field>
                <Field label="Ringkasan" wide><textarea className={areaClass} value={form.summary} onChange={(event) => update("summary", event.target.value)} maxLength={1500} minLength={15} placeholder="Jelaskan karakter racikan dan konteks yang sesuai." required /><span className="text-right text-[10px] font-medium text-[#939b91]">{form.summary.length}/1.500</span></Field>
                <Field label="Foto racikan" hint="Pilih aset lokal yang sudah tersedia agar tidak ada gambar rusak."><select className={fieldClass} value={form.image} onChange={(event) => update("image", event.target.value)}>{imageOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                <Field label="Penulis"><input className={fieldClass} value={form.author} onChange={(event) => update("author", event.target.value)} maxLength={100} /></Field>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e7ebe5] bg-white p-4">
              <h3 className="text-xs font-extrabold uppercase tracking-[.11em] text-[#58685a]">Kondisi & harga</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Cuaca" hint="Pisahkan dengan koma"><input className={fieldClass} value={form.weather} onChange={(event) => update("weather", event.target.value)} placeholder="Hujan, Mendung" /></Field>
                <Field label="Kondisi air" hint="Pisahkan dengan koma"><input className={fieldClass} value={form.water} onChange={(event) => update("water", event.target.value)} placeholder="Keruh, Hijau" /></Field>
                <Field label="Jenis pemancingan"><input className={fieldClass} value={form.fishingTypes} onChange={(event) => update("fishingTypes", event.target.value)} placeholder="Harian, Lomba, Galatama" /></Field>
                <Field label="Musim"><input className={fieldClass} value={form.seasons} onChange={(event) => update("seasons", event.target.value)} placeholder="Musim Hujan, Peralihan" /></Field>
                <Field label="Provinsi terkait"><input className={fieldClass} value={form.provinces} onChange={(event) => update("provinces", event.target.value)} placeholder="Jawa Barat, Banten" /></Field>
                <Field label="Tingkat kesulitan"><select className={fieldClass} value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)}>{["Mudah", "Menengah", "Tingkat lanjut"].map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Label harga"><input className={fieldClass} value={form.price} onChange={(event) => update("price", event.target.value)} maxLength={80} placeholder="Rp20.000–25.000" /></Field>
                <Field label="Harga acuan (angka, Rp)"><input className={fieldClass} type="number" min="0" max="100000000" value={form.priceValue} onChange={(event) => update("priceValue", event.target.value)} /></Field>
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
              <RecipePreview form={form} />
            </div>
          )}
          {error && <p role="alert" className="mx-4 mb-2 rounded-xl border border-[#efdcd5] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold leading-5 text-[#9c513e] sm:mx-6">{error}</p>}
          <div className="sticky bottom-0 flex flex-col-reverse justify-between gap-2 border-t border-[#e6eae4] bg-[#f9faf8]/95 px-4 py-3 backdrop-blur sm:flex-row sm:px-6">
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#677367]">Batal</button>
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedRecipe | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  const [importingSeeds, setImportingSeeds] = useState(false);

  async function load(signal?: AbortSignal) {
    const response = await fetch("/api/admin/recipes", { cache: "no-store", signal });
    const body = await response.json() as { recipes?: ManagedRecipe[]; error?: string };
    if (!response.ok) throw new Error(body.error ?? "Konten tidak dapat dimuat.");
    setItems(body.recipes ?? []);
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void load(controller.signal).catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Gagal memuat konten."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
      if (new URLSearchParams(window.location.search).get("create") === "1") setEditorOpen(true);
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, []);

  const filtered = useMemo(() => items.filter((item) => (filter === "Semua" || item.status === filter) && `${item.title} ${item.slug} ${item.category} ${item.author}`.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID"))), [items, filter, query]);
  const counts = useMemo(() => ({ all: items.length, published: items.filter((item) => item.status === "published").length, draft: items.filter((item) => item.status === "draft").length, archived: items.filter((item) => item.status === "archived").length }), [items]);
  const missingSeeds = useMemo(() => seedRecipes.filter((seed) => !items.some((item) => item.slug === seed.slug)).length, [items]);

  async function importStarterRecipes() {
    setImportingSeeds(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/recipes/import", { method: "POST" });
      const body = await response.json() as { error?: string; imported?: number; updated?: number };
      if (!response.ok) throw new Error(body.error ?? "Sinkronisasi gagal.");
      setNotice(`Sinkronisasi selesai: ${body.imported ?? 0} resep baru, ${body.updated ?? 0} diperbarui.`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Sinkronisasi gagal."); }
    finally { setImportingSeeds(false); }
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
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#899488]"><Link href="/dashboard" className="hover:text-[#3f6044]">Studio</Link><span>/</span><span>Konten</span></div>
          <h1 className="mt-2 text-3xl font-black tracking-[-.045em] text-[#25372a] sm:text-4xl">Konten resep</h1>
          <p className="mt-2 text-sm text-[#7a8579]">Susun, tinjau, dan publikasikan racikan umpan ikan mas.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button type="button" onClick={() => void importStarterRecipes()} disabled={importingSeeds} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dfe7dc] bg-white px-3.5 text-[11px] font-bold text-[#506550] transition hover:bg-[#f3f6f0] disabled:opacity-60"><Database size={15} />{importingSeeds ? "Menyinkronkan…" : missingSeeds > 0 ? `Sinkronkan katalog · ${missingSeeds} resep baru` : "Sinkronkan katalog & ulasan"}</button>
          <button type="button" onClick={() => { setEditing(undefined); setEditorOpen(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29]"><Plus size={16} /> Tulis resep</button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#e6eae4] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#929a91]">Semua konten</p><p className="mt-2 text-2xl font-black text-[#344638]">{counts.all}</p></div>
        <div className="rounded-2xl border border-[#e6eae4] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#929a91]">Tayang publik</p><p className="mt-2 text-2xl font-black text-[#46714b]">{counts.published}</p></div>
        <div className="rounded-2xl border border-[#e6eae4] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#929a91]">Draft</p><p className="mt-2 text-2xl font-black text-[#9a8047]">{counts.draft}</p></div>
        <div className="rounded-2xl border border-[#e6eae4] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#929a91]">Diarsipkan</p><p className="mt-2 text-2xl font-black text-[#829082]">{counts.archived}</p></div>
      </div>

      {notice && <p role="status" className="mb-4 rounded-xl border border-[#dbe8d7] bg-[#f0f6ed] px-4 py-3 text-xs font-semibold text-[#436444]">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold text-[#995744]">{error}</p>}

      <section className="overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]">
        <div className="flex flex-col gap-3 border-b border-[#eef0ec] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div><h2 className="text-sm font-extrabold text-[#344638]">Pustaka racikan</h2><p className="mt-1 text-[10px] text-[#929a91]">{filtered.length} dari {items.length} resep CMS</p></div>
            <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#e4e9e2] px-3 sm:w-72"><Search size={15} className="text-[#929a91]" /><span className="sr-only">Cari konten</span><input className="w-full bg-transparent text-xs outline-none placeholder:text-[#a0a79f]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul, slug, kategori…" /></label>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {statusFilters.map((item) => (
              <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} className={`min-h-8 shrink-0 rounded-full px-3 text-[10px] font-bold transition ${filter === item ? "bg-[#294b34] text-white" : "bg-[#f3f5f1] text-[#667366] hover:bg-[#e8eee5]"}`}>
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
                  <th className="px-5 py-3">Judul konten</th><th className="px-4 py-3">Kondisi</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Diperbarui</th><th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2ee]">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition hover:bg-[#fafbf9]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="relative h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-[#edf1ea]"><Image src={item.image || "/images/recipe-putih.jpg"} alt="" fill unoptimized sizes="48px" className="object-cover" /></span>
                        <div className="min-w-0">
                          <p className="max-w-[270px] truncate text-xs font-extrabold text-[#37483a]">{item.title}</p>
                          <p className="mt-1 max-w-[270px] truncate text-[9px] text-[#969d94]">/{item.slug} · ★ {(item.rating / 10).toFixed(1)} · {new Intl.NumberFormat("id-ID").format(item.users)} pemancing</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex max-w-[260px] flex-wrap gap-1.5">
                        {item.weather.slice(0, 1).map((weather) => <Badge key={weather} className={chipClass}>{weather === "Hujan" ? "🌧️" : weather === "Cerah" ? "☀️" : "☁️"} {weather}</Badge>)}
                        {item.water.slice(0, 1).map((water) => <Badge key={water} tone="cream" className={chipClass}>💧 {water}</Badge>)}
                        {item.fishingTypes.slice(0, 1).map((type) => <Badge key={type} tone="cream" className={chipClass}>🎣 {type}</Badge>)}
                      </div>
                      <p className="mt-1.5 text-[9px] font-semibold text-[#969d94]">{item.ingredients.filter((entry) => !entry.optional).length} bahan · {item.ingredients.filter((entry) => entry.optional).length} opsional</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-[#677467]">{item.category}</td>
                    <td className="px-4 py-3.5"><Badge tone={item.status === "published" ? "sage" : item.status === "draft" ? "gold" : "cream"}>{item.status === "published" ? "Published" : item.status === "draft" ? "Draft" : "Archived"}</Badge></td>
                    <td className="px-4 py-3.5 text-[10px] text-[#929a91]">{formattedDate(item.updatedAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/konten?edit=${item.id}`} aria-label={`Buka detail ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#657664] hover:bg-[#edf3e9] hover:text-[#345b3a]"><Eye size={14} /></Link>
                        <button type="button" onClick={() => { setEditing(item); setEditorOpen(true); }} aria-label={`Edit ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#657664] hover:bg-[#edf3e9] hover:text-[#345b3a]"><FilePenLine size={14} /></button>
                        {item.status !== "published" ? (
                          <button type="button" onClick={() => void changeStatus(item, "published")} disabled={pending === item.id} aria-label={`Publikasikan ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#547753] hover:bg-[#edf3e9] disabled:opacity-40"><Globe2 size={14} /></button>
                        ) : (
                          <button type="button" onClick={() => void changeStatus(item, "draft")} disabled={pending === item.id} aria-label={`Jadikan ${item.title} draft`} className="grid h-8 w-8 place-items-center rounded-lg text-[#927c4a] hover:bg-[#f8f4e9] disabled:opacity-40"><FilePenLine size={14} /></button>
                        )}
                        <button type="button" onClick={() => void remove(item)} disabled={pending === item.id} aria-label={`Hapus ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#a26b5b] hover:bg-[#fbefec] disabled:opacity-40"><Trash2 size={14} /></button>
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
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#eef3e9] text-[#658063]"><CirclePlus size={21} /></span>
              <h3 className="mt-4 text-sm font-extrabold text-[#3b4b3d]">{query || filter !== "Semua" ? "Konten tidak ditemukan" : "Mulai pustaka racikan"}</h3>
              <p className="mt-1.5 max-w-sm text-xs leading-5 text-[#8a9389]">{query || filter !== "Semua" ? "Coba kata kunci atau status yang lain." : "Buat resep, simpan sebagai draft, lalu publikasikan saat siap."}</p>
              <button type="button" onClick={() => { setEditing(undefined); setEditorOpen(true); }} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-bold text-white"><Plus size={14} /> Buat resep pertama <ArrowRight size={13} /></button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef0ec] bg-[#fafbf9] px-4 py-3 text-[9px] text-[#959c93] sm:px-5">
          <span>Database PostgreSQL · perubahan langsung</span>
          <span className="inline-flex items-center gap-1"><ChevronDown size={12} /> {items.length} resep</span>
        </div>
      </section>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#edf2e9] px-4 py-3 text-[10px] leading-5 text-[#6b786a]"><Globe2 size={13} className="mt-0.5 shrink-0" />Status <strong>Published</strong> membuat resep tersedia di katalog publik. Draft dan arsip hanya tampil di dashboard.</div>

      {editorOpen && <RecipeEditor key={editing?.id ?? "new"} recipe={editing} onClose={() => { setEditorOpen(false); setEditing(undefined); router.replace("/dashboard/konten"); }} onSave={save} />}
    </AdminShell>
  );
}
