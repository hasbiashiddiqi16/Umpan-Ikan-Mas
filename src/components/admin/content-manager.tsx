"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, CirclePlus, Database, FilePenLine, Globe2, Plus, Search, Send, Trash2, X } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/shared";
import { recipes as seedRecipes } from "@/data/recipes";
import { slugify } from "@/lib/utils";

export type ManagedRecipe = {
  id: number; slug: string; title: string; summary: string; category: string; status: string; image: string; price: string; priceValue: number; difficulty: string; rating: number; reviewCount: number; users: number; popularity: number; weather: string[]; water: string[]; fishingTypes: string[]; provinces: string[]; seasons: string[]; ingredients: { name: string; brand: string; amount: string }[]; steps: string[]; suitable: string[]; notSuitable: string[]; author: string; createdAt: string; updatedAt: string;
};

type RecipeForm = {
  title: string; slug: string; summary: string; category: string; status: string; image: string; price: string; priceValue: string; difficulty: string; weather: string; water: string; fishingTypes: string; provinces: string; seasons: string; ingredients: string; steps: string; suitable: string; notSuitable: string; author: string;
};

const blankForm: RecipeForm = { title: "", slug: "", summary: "", category: "Harian", status: "draft", image: "/images/recipe-putih.jpg", price: "Rp15.000–30.000", priceValue: "20000", difficulty: "Mudah", weather: "Hujan, Mendung", water: "Keruh", fishingTypes: "Harian", provinces: "Jawa Barat", seasons: "Musim Hujan", ingredients: "Pelet ikan | Pelet Jitu | 50 g\nTepung tapioka | Rose Brand | 15 g", steps: "Haluskan pelet hingga lembut.\nCampurkan bahan kering sampai rata.\nTambahkan air sedikit demi sedikit sampai adonan mudah dibentuk.", suitable: "Kolam harian\nIkan mas aktif", notSuitable: "Air sangat jernih", author: "Tim UMPAN MAS" };
const statusFilters = ["Semua", "published", "draft", "archived"];
const fieldClass = "min-h-11 w-full rounded-xl border border-[#e2e8e1] bg-white px-3.5 text-sm text-[#344638] outline-none transition placeholder:text-[#a1a89f] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";
const areaClass = "min-h-24 w-full resize-y rounded-xl border border-[#e2e8e1] bg-white px-3.5 py-3 text-sm leading-6 text-[#344638] outline-none transition placeholder:text-[#a1a89f] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";
const categoryOptions = ["Harian", "Lomba", "Galat", "Premium", "Ekonomis"];
const statuses = ["draft", "published", "archived"];

function listFrom(text: string) { return text.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean); }
function parseIngredientText(text: string) { return text.split("\n").map((line) => line.split("|").map((part) => part.trim())).filter((parts) => parts[0] && parts[2]).map(([name, brand, amount]) => ({ name, brand: brand || "-", amount })); }
function formFromRecipe(recipe: ManagedRecipe): RecipeForm {
  return { title: recipe.title, slug: recipe.slug, summary: recipe.summary, category: recipe.category, status: recipe.status, image: recipe.image, price: recipe.price, priceValue: String(recipe.priceValue), difficulty: recipe.difficulty, weather: recipe.weather.join(", "), water: recipe.water.join(", "), fishingTypes: recipe.fishingTypes.join(", "), provinces: recipe.provinces.join(", "), seasons: recipe.seasons.join(", "), ingredients: recipe.ingredients.map((item) => `${item.name} | ${item.brand} | ${item.amount}`).join("\n"), steps: recipe.steps.join("\n"), suitable: recipe.suitable.join("\n"), notSuitable: recipe.notSuitable.join("\n"), author: recipe.author };
}
function toPayload(form: RecipeForm, status = form.status) {
  return { ...form, title: form.title.trim(), slug: form.slug.trim() || slugify(form.title), summary: form.summary.trim(), status, priceValue: Number(form.priceValue), weather: listFrom(form.weather), water: listFrom(form.water), fishingTypes: listFrom(form.fishingTypes), provinces: listFrom(form.provinces), seasons: listFrom(form.seasons), ingredients: parseIngredientText(form.ingredients), steps: listFrom(form.steps), suitable: listFrom(form.suitable), notSuitable: listFrom(form.notSuitable) };
}
function formattedDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date); }

function Field({ label, hint, children, wide = false }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return <label className={`grid gap-1.5 text-xs font-bold text-[#657164] ${wide ? "sm:col-span-2" : ""}`}><span>{label}</span>{children}{hint && <span className="text-[10px] font-medium leading-4 text-[#959c93]">{hint}</span>}</label>;
}

function RecipeEditor({ recipe, onClose, onSave }: { recipe?: ManagedRecipe; onClose: () => void; onSave: (payload: ReturnType<typeof toPayload>, id?: number) => Promise<void> }) {
  const [form, setForm] = useState<RecipeForm>(recipe ? formFromRecipe(recipe) : blankForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof RecipeForm, value: string) => setForm((current) => ({ ...current, [key]: value, ...(key === "title" && !recipe ? { slug: slugify(value) } : {}) }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (parseIngredientText(form.ingredients).length === 0) { setError("Tambahkan bahan dengan format: Nama | Merek | Takaran."); return; }
    if (listFrom(form.steps).length === 0) { setError("Tambahkan setidaknya satu langkah persiapan."); return; }
    setBusy(true);
    try { await onSave(toPayload(form), recipe?.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Konten gagal disimpan."); }
    finally { setBusy(false); }
  }

  async function publish(status: string) {
    setError("");
    if (form.title.trim().length < 3 || form.summary.trim().length < 15) { setError("Lengkapi judul dan ringkasan sebelum mengganti status."); return; }
    if (parseIngredientText(form.ingredients).length === 0) { setError("Tambahkan minimal satu bahan dengan format Nama | Merek | Takaran."); return; }
    setBusy(true);
    try { await onSave(toPayload(form, status), recipe?.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Konten gagal disimpan."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#16251b]/55 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="recipe-editor-title" className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-[25px] bg-[#f9faf8] shadow-2xl sm:rounded-[25px]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e7ebe4] bg-white/95 px-5 py-4 backdrop-blur"><div><p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-[#899488]">Content Studio / Resep</p><h2 id="recipe-editor-title" className="mt-1 text-lg font-black text-[#2b3c2e]">{recipe ? "Edit resep" : "Tulis resep baru"}</h2></div><button type="button" aria-label="Tutup editor" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[#f0f3ed] text-[#536253] hover:bg-[#e5ebe2]"><X size={17} /></button></div>
        <form onSubmit={submit} className="space-y-5 p-4 sm:p-6">
          <section className="rounded-2xl border border-[#e7ebe5] bg-white p-4"><h3 className="text-xs font-extrabold uppercase tracking-[.11em] text-[#58685a]">Informasi utama</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Judul resep"><input autoFocus className={fieldClass} value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={180} minLength={3} placeholder="Contoh: Umpan Putih Kroto" required /></Field><Field label="Slug URL" hint="Alamat halaman detail. Harus unik."><input className={fieldClass} value={form.slug} onChange={(event) => update("slug", slugify(event.target.value))} maxLength={180} placeholder="umpan-putih-kroto" required /></Field><Field label="Kategori"><select className={fieldClass} value={form.category} onChange={(event) => update("category", event.target.value)}>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Status konten"><select className={fieldClass} value={form.status} onChange={(event) => update("status", event.target.value)}>{statuses.map((item) => <option key={item} value={item}>{item === "published" ? "Published · tampil publik" : item === "draft" ? "Draft · hanya admin" : "Archived · disimpan"}</option>)}</select></Field><Field label="Ringkasan" wide><textarea className={areaClass} value={form.summary} onChange={(event) => update("summary", event.target.value)} maxLength={1500} minLength={15} placeholder="Jelaskan karakter racikan dan konteks yang sesuai." required /><span className="text-right text-[10px] font-medium text-[#939b91]">{form.summary.length}/1.500</span></Field><Field label="Foto racikan" hint="Pilih aset lokal yang sudah tersedia agar tidak ada gambar rusak."><select className={fieldClass} value={form.image} onChange={(event) => update("image", event.target.value)}><option value="/images/recipe-putih.jpg">Umpan putih · kroto</option><option value="/images/recipe-pelet.jpg">Pelet · pandan</option><option value="/images/recipe-jagung.jpg">Jagung · kroto</option></select></Field><Field label="Penulis"><input className={fieldClass} value={form.author} onChange={(event) => update("author", event.target.value)} maxLength={100} /></Field></div></section>

          <section className="rounded-2xl border border-[#e7ebe5] bg-white p-4"><h3 className="text-xs font-extrabold uppercase tracking-[.11em] text-[#58685a]">Kondisi & harga</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Cuaca" hint="Pisahkan dengan koma"><input className={fieldClass} value={form.weather} onChange={(event) => update("weather", event.target.value)} placeholder="Hujan, Mendung" /></Field><Field label="Kondisi air" hint="Pisahkan dengan koma"><input className={fieldClass} value={form.water} onChange={(event) => update("water", event.target.value)} placeholder="Keruh, Hijau" /></Field><Field label="Jenis pemancingan"><input className={fieldClass} value={form.fishingTypes} onChange={(event) => update("fishingTypes", event.target.value)} placeholder="Harian, Lomba, Galat" /></Field><Field label="Musim"><input className={fieldClass} value={form.seasons} onChange={(event) => update("seasons", event.target.value)} placeholder="Musim Hujan, Peralihan" /></Field><Field label="Provinsi terkait"><input className={fieldClass} value={form.provinces} onChange={(event) => update("provinces", event.target.value)} placeholder="Jawa Barat, Banten" /></Field><Field label="Tingkat kesulitan"><select className={fieldClass} value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)}>{["Mudah", "Menengah", "Tingkat lanjut"].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Label harga"><input className={fieldClass} value={form.price} onChange={(event) => update("price", event.target.value)} maxLength={80} placeholder="Rp20.000–25.000" /></Field><Field label="Harga acuan (angka, Rp)"><input className={fieldClass} type="number" min="0" max="100000000" value={form.priceValue} onChange={(event) => update("priceValue", event.target.value)} /></Field></div></section>

          <section className="rounded-2xl border border-[#e7ebe5] bg-white p-4"><h3 className="text-xs font-extrabold uppercase tracking-[.11em] text-[#58685a]">Bahan & langkah</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Daftar bahan" hint="Satu baris per bahan: Nama | Merek / catatan | Takaran" wide><textarea className={`${areaClass} min-h-36 font-mono text-xs`} value={form.ingredients} onChange={(event) => update("ingredients", event.target.value)} placeholder={'Pelet ikan | Pelet Jitu | 50 g\nTepung tapioka | Rose Brand | 15 g'} /></Field><Field label="Langkah persiapan" hint="Satu langkah per baris" wide><textarea className={`${areaClass} min-h-32`} value={form.steps} onChange={(event) => update("steps", event.target.value)} placeholder={'Haluskan pelet.\nCampurkan bahan kering.\nTambahkan air perlahan.'} /></Field><Field label="Cocok untuk" hint="Pisahkan dengan baris baru atau koma"><textarea className={areaClass} value={form.suitable} onChange={(event) => update("suitable", event.target.value)} /></Field><Field label="Kurang cocok untuk" hint="Pisahkan dengan baris baru atau koma"><textarea className={areaClass} value={form.notSuitable} onChange={(event) => update("notSuitable", event.target.value)} /></Field></div></section>

          {error && <p role="alert" className="rounded-xl border border-[#efdcd5] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold leading-5 text-[#9c513e]">{error}</p>}
          <div className="sticky bottom-0 flex flex-col-reverse justify-between gap-2 border-t border-[#e6eae4] bg-[#f9faf8]/95 py-3 backdrop-blur sm:flex-row"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#677367]">Batal</button><div className="flex flex-col gap-2 sm:flex-row"><button type="submit" disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dce4d9] bg-white px-4 text-xs font-bold text-[#456047] hover:bg-[#f3f6f0] disabled:opacity-60"><Check size={14} /> {busy ? "Menyimpan…" : "Simpan perubahan"}</button><button type="button" disabled={busy} onClick={() => void publish("published")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-xs font-bold text-white hover:bg-[#203d29] disabled:opacity-60"><Send size={14} /> Publikasikan</button></div></div>
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
    if (missingSeeds === 0) { setNotice("Semua resep contoh sudah tercatat di CMS."); return; }
    setImportingSeeds(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/recipes/import", { method: "POST" });
      const body = await response.json() as { imported?: number; skipped?: number; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Impor resep contoh gagal.");
      setNotice(`${body.imported ?? 0} resep contoh diimpor dan dipublikasikan; ${body.skipped ?? 0} resep yang sudah ada dilewati.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impor resep contoh gagal.");
    } finally {
      setImportingSeeds(false);
    }
  }

  async function save(payload: ReturnType<typeof toPayload>, id?: number) {
    const response = await fetch(id ? `/api/admin/recipes/${id}` : "/api/admin/recipes", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json() as { recipe?: ManagedRecipe; error?: string };
    if (!response.ok) throw new Error(body.error ?? "Konten gagal disimpan.");
    setNotice(id ? "Perubahan resep berhasil disimpan." : payload.status === "published" ? "Resep baru berhasil dipublikasikan." : "Draft resep baru berhasil disimpan.");
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
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#899488]"><Link href="/dashboard" className="hover:text-[#3f6044]">Studio</Link><span>/</span><span>Konten</span></div><h1 className="mt-2 text-3xl font-black tracking-[-.045em] text-[#25372a] sm:text-4xl">Konten resep</h1><p className="mt-2 text-sm text-[#7a8579]">Susun, tinjau, dan publikasikan racikan umpan ikan mas.</p></div><div className="flex flex-wrap gap-2 self-start sm:self-auto">{missingSeeds > 0 && <button type="button" onClick={() => void importStarterRecipes()} disabled={importingSeeds} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dfe7dc] bg-white px-3.5 text-[11px] font-bold text-[#506550] transition hover:bg-[#f3f6f0] disabled:opacity-60"><Database size={15} />{importingSeeds ? "Mengimpor…" : `Impor resep contoh · ${missingSeeds}`}</button>}<button type="button" onClick={() => { setEditing(undefined); setEditorOpen(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29]"><Plus size={16} /> Tulis resep</button></div></div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-2xl border border-[#e6eae4] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#929a91]">Semua konten</p><p className="mt-2 text-2xl font-black text-[#344638]">{counts.all}</p></div><div className="rounded-2xl border border-[#e6eae4] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#929a91]">Tayang publik</p><p className="mt-2 text-2xl font-black text-[#46714b]">{counts.published}</p></div><div className="rounded-2xl border border-[#e6eae4] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#929a91]">Draft</p><p className="mt-2 text-2xl font-black text-[#9a8047]">{counts.draft}</p></div><div className="rounded-2xl border border-[#e6eae4] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#929a91]">Diarsipkan</p><p className="mt-2 text-2xl font-black text-[#829082]">{counts.archived}</p></div></div>
      {notice && <p role="status" className="mb-4 rounded-xl border border-[#dbe8d7] bg-[#f0f6ed] px-4 py-3 text-xs font-semibold text-[#436444]">{notice}</p>}{error && <p role="alert" className="mb-4 rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold text-[#995744]">{error}</p>}
      <section className="overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]"><div className="flex flex-col gap-3 border-b border-[#eef0ec] p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-sm font-extrabold text-[#344638]">Pustaka racikan</h2><p className="mt-1 text-[10px] text-[#929a91]">{filtered.length} dari {items.length} resep CMS</p></div><label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#e4e9e2] px-3 sm:w-72"><Search size={15} className="text-[#929a91]" /><span className="sr-only">Cari konten</span><input className="w-full bg-transparent text-xs outline-none placeholder:text-[#a0a79f]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul, slug, kategori…" /></label></div><div className="flex gap-2 overflow-x-auto">{statusFilters.map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} className={`min-h-8 shrink-0 rounded-full px-3 text-[10px] font-bold transition ${filter === item ? "bg-[#294b34] text-white" : "bg-[#f3f5f1] text-[#667366] hover:bg-[#e8eee5]"}`}>{item === "Semua" ? `Semua · ${counts.all}` : item === "published" ? `Tayang · ${counts.published}` : item === "draft" ? `Draft · ${counts.draft}` : `Arsip · ${counts.archived}`}</button>)}</div></div>
        {loading ? <div className="grid gap-3 p-4">{[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-[#f1f4ef]" />)}</div> : filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left"><thead><tr className="border-b border-[#eef0ec] text-[9px] font-extrabold uppercase tracking-[.12em] text-[#9ba198]"><th className="px-5 py-3">Judul konten</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Diperbarui</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-[#f0f2ee]">{filtered.map((item) => <tr key={item.id} className="transition hover:bg-[#fafbf9]"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="relative h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-[#edf1ea]"><Image src={item.image || "/images/recipe-putih.jpg"} alt="" fill sizes="48px" className="object-cover" /></span><div className="min-w-0"><p className="max-w-[270px] truncate text-xs font-extrabold text-[#37483a]">{item.title}</p><p className="mt-1 max-w-[270px] truncate text-[9px] text-[#969d94]">/{item.slug} · ★ {(item.rating / 10).toFixed(1)} · {new Intl.NumberFormat("id-ID").format(item.users)} pemancing</p></div></div></td><td className="px-4 py-3.5 text-xs font-semibold text-[#677467]">{item.category}</td><td className="px-4 py-3.5"><Badge tone={item.status === "published" ? "sage" : item.status === "draft" ? "gold" : "cream"}>{item.status === "published" ? "Published" : item.status === "draft" ? "Draft" : "Archived"}</Badge></td><td className="px-4 py-3.5 text-[10px] text-[#929a91]">{formattedDate(item.updatedAt)}</td><td className="px-5 py-3.5"><div className="flex items-center justify-end gap-1"><button type="button" onClick={() => { setEditing(item); setEditorOpen(true); }} aria-label={`Edit ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#657664] hover:bg-[#edf3e9] hover:text-[#345b3a]"><FilePenLine size={14} /></button>{item.status !== "published" ? <button type="button" onClick={() => void changeStatus(item, "published")} disabled={pending === item.id} aria-label={`Publikasikan ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#547753] hover:bg-[#edf3e9] disabled:opacity-40"><Globe2 size={14} /></button> : <button type="button" onClick={() => void changeStatus(item, "draft")} disabled={pending === item.id} aria-label={`Jadikan ${item.title} draft`} className="grid h-8 w-8 place-items-center rounded-lg text-[#927c4a] hover:bg-[#f8f4e9] disabled:opacity-40"><FilePenLine size={14} /></button>}<button type="button" onClick={() => void remove(item)} disabled={pending === item.id} aria-label={`Hapus ${item.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#a26b5b] hover:bg-[#fbefec] disabled:opacity-40"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div> : <div className="grid min-h-64 place-items-center px-6 py-12 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#eef3e9] text-[#658063]"><CirclePlus size={21} /></span><h3 className="mt-4 text-sm font-extrabold text-[#3b4b3d]">{query || filter !== "Semua" ? "Konten tidak ditemukan" : "Mulai pustaka racikan"}</h3><p className="mt-1.5 max-w-sm text-xs leading-5 text-[#8a9389]">{query || filter !== "Semua" ? "Coba kata kunci atau status yang lain." : "Buat resep, simpan sebagai draft, lalu publikasikan saat siap."}</p><button type="button" onClick={() => { setEditing(undefined); setEditorOpen(true); }} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-bold text-white"><Plus size={14} /> Buat resep pertama <ArrowRight size={13} /></button></div></div>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef0ec] bg-[#fafbf9] px-4 py-3 text-[9px] text-[#959c93] sm:px-5"><span>Database PostgreSQL · perubahan langsung</span><span className="inline-flex items-center gap-1"><ChevronDown size={12} /> {items.length} resep</span></div>
      </section>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#edf2e9] px-4 py-3 text-[10px] leading-5 text-[#6b786a]"><Globe2 size={13} className="mt-0.5 shrink-0" />Status <strong>Published</strong> membuat resep tersedia di katalog publik. Draft dan arsip hanya tampil di dashboard.</div>
      {editorOpen && <RecipeEditor key={editing?.id ?? "new"} recipe={editing} onClose={() => { setEditorOpen(false); setEditing(undefined); router.replace("/dashboard/konten"); }} onSave={save} />}
    </AdminShell>
  );
}
