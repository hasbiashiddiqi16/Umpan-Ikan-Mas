"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Beaker, BookOpenCheck, BrainCircuit, Bug, Check, Compass, Croissant, Droplets, Egg, Fish, FlaskConical, Info, Leaf, MapPin, Medal, MessageSquareText, MessagesSquare, Milk, Nut, Soup, Sparkles, Sprout, Waves, Wheat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ingredientKnowledge, type IngredientKnowledge } from "@/data/ingredient-knowledge";
import { PRICE_FACTOR_NOTE, PRICE_NOTE, PRICE_UPDATED_AT, SESI_NOTE, WILAYAH_FACTOR, formatRupiah, tabelHarga, wilayahLabel, wilayahUntukProvinsi } from "@/data/ingredient-prices";
import { WATER_BODIES, recipes, defaultPreferences, type FishingType, type Recipe, type Weather, type WaterCondition } from "@/data/recipes";
import { MATCH_WEIGHT_ENTRIES, MATCH_WEIGHTS_VERSION } from "@/lib/recommendation-config";
import { provinces } from "@/data/provinces";
import { SELECT_FIELD_CLASS, SelectBox } from "@/components/form-fields";
import type { RecipeReview } from "@/data/reviews";
import type { CmsRecipeRecord } from "@/lib/cms";
import { cmsRecipeToRecipe, mergeRecipesBySlug } from "@/lib/cms";
import { COMMUNITY_REVIEWS_EVENT, readCommunityReviews, sebagaiUlasanPublik } from "@/lib/community-storage";
import { BLEND_LIMITS_SUMMARY, BLEND_ROLE_RULES, BLEND_RULES_SUMMARY, MAX_BLEND_INGREDIENTS, MIN_BLEND_INGREDIENTS, MIN_INGREDIENT_PERCENT, namaBahan, ruleRangeLabel, type BlendSuggestion, type RoleShareStatus } from "@/lib/blend-rules";
import { buildExpertBlend, getExpertKnowledgeStats, getKnowledgeEvidenceDescription } from "@/lib/expert-system";
import type { UserPreferences } from "@/lib/recommendation";
import { Badge, SectionHeader } from "@/components/shared";
import { UseMyLocationButton } from "@/components/location-controls";
import { useLocationAutofill } from "@/lib/use-location";
import { saveVisitorPreferences } from "@/lib/visitor-preferences";

const selectClass = `${SELECT_FIELD_CLASS} min-h-12 w-full min-w-0 rounded-xl border border-[#e3e8e1] bg-white pl-3.5 text-sm font-semibold text-[#3d4d3f] outline-none transition focus:border-[#718b70] focus:ring-4 focus:ring-[#365b3a]/10 sm:min-h-11`;
const STATUS_PERAN: Record<RoleShareStatus, string> = {
  sesuai: "sesuai aturan",
  kurang: "di bawah aturan",
  lebih: "di atas aturan",
  "tidak-dipakai": "belum dipakai",
};

/** Peta kunci ikon bahan (dari `ingredientKnowledge`) ke ikon SVG Lucide. */
const INGREDIENT_ICONS: Record<string, LucideIcon> = {
  ikan: Fish, roti: Croissant, mangkuk: Soup, gandum: Wheat, telur: Egg,
  serangga: Bug, jagung: Sprout, susu: Milk, keju: Sparkles, daun: Leaf,
  tetes: Droplets, kelapa: Nut,
};

function IngredientIcon({ id, size = 16, className = "" }: { id: string; size?: number; className?: string }) {
  const Icon = INGREDIENT_ICONS[id] ?? Sparkles;
  return <Icon size={size} className={className} aria-hidden="true" />;
}

const ratioColors = ["bg-[#315b3c]", "bg-[#638363]", "bg-[#a7b78d]", "bg-[#d3b45f]", "bg-[#9a7449]", "bg-[#839d9a]"];

function Field({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: ReactNode }) {
  return <label className="grid gap-1.5 text-xs font-bold text-[#636e62] (4.58:1 terburuk)"><span className="inline-flex items-center gap-1.5"><Icon size={13} /> {label}</span>{children}</label>;
}

function IngredientOption({ item, selected, disabled = false, onClick }: { item: IngredientKnowledge; selected: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} disabled={disabled} aria-disabled={disabled} title={disabled ? `Sudah ${MAX_BLEND_INGREDIENTS} bahan dipilih — lepas satu dulu untuk menambah bahan lain.` : undefined} className={`relative min-h-[98px] rounded-2xl border p-3.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31593a] ${selected ? "border-[#5c7f59] bg-[#f1f6ee] shadow-[0_0_0_2px_rgba(63,103,63,.07)]" : disabled ? "cursor-not-allowed border-[#eceeea] bg-[#f7f8f5] opacity-60" : "border-[#e7ebe5] bg-white hover:border-[#cbd8c8] hover:bg-[#fafcf9]"}`}>
      <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full border border-[#dce4d9] bg-white">{selected && <Check size={12} className="text-[#3d6941]" />}</span>
      <IngredientIcon id={item.icon} size={20} className="text-[#547056] (4.71:1 terburuk)" /><span className="mt-2 block pr-5 text-sm font-extrabold text-[#344638]">{item.name}</span><span className="mt-1 inline-flex rounded-full bg-[#f2f4ef] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] text-[#636c60] (4.69:1 terburuk)">{item.role}</span>
    </button>
  );
}

function ExpertRecipeEvidence({ result, index }: { result: NonNullable<ReturnType<typeof buildExpertBlend>>["recipeMatches"][number]; index: number }) {
  const medalColor = ["text-[#886611] (4.55:1 terburuk)", "text-[#5f6a5f]", "text-[#9a5b2e]"][index] ?? "text-[#5f6a5f]";
  return (
    <Link href={`/resep/${result.recipe.slug}`} aria-label={`Peringkat ${index + 1}: ${result.recipe.name}, kecocokan ${result.score}%`} className="group flex items-center gap-3 rounded-2xl border border-[#e5eae3] bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-[#cbd8c8] hover:shadow-sm">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f5f5ef]" aria-hidden="true"><Medal size={19} className={medalColor} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-[#334437] group-hover:text-[#315c3b]">{result.recipe.name}</p><p className="mt-1 text-[10px] text-[#666d65] (4.57:1 terburuk)">Bahan {result.ingredientFit}% · Bukti komunitas {result.communityFit}%</p></div>
      <span className="shrink-0 text-right"><strong className="block text-lg leading-none text-[#31593a]">{result.score}%</strong><small className="text-[9px] font-bold uppercase tracking-wider text-[#929a91]">match</small></span>
    </Link>
  );
}

export function ExpertSystem({ initialRecipes, initialManagedSlugs }: { initialRecipes?: Recipe[]; initialManagedSlugs?: string[] }) {
  // Provinsi dibiarkan kosong sampai lokasi diizinkan atau dipilih manual.
  const [preferences, setPreferences] = useState<UserPreferences>({ ...defaultPreferences, province: "" });
  // Mulai tanpa bahan terpilih: skor dan analisis hanya muncul setelah pengunjung
  // benar-benar memilih (aturan yang sama dengan skor kecocokan).
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { markTouched: markLocationTouched } = useLocationAutofill((place) => {
    setPreferences((current) => ({ ...current, province: place.province }));
  });
  const [localReviews, setLocalReviews] = useState<ReturnType<typeof readCommunityReviews>>([]);
  const [publishedRecipes, setPublishedRecipes] = useState<Recipe[]>(() => initialRecipes ?? []);
  const [shadowedSlugs, setShadowedSlugs] = useState<string[]>(() => initialManagedSlugs ?? []);
  const [approvedReviews, setApprovedReviews] = useState<RecipeReview[]>([]);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const sync = () => setLocalReviews(readCommunityReviews());
    sync();
    const controller = new AbortController();
    void fetch("/api/public/recipes", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ recipes?: CmsRecipeRecord[]; shadowedSlugs?: string[] }> : { recipes: [], shadowedSlugs: [] })
      .then((body) => {
        setPublishedRecipes((body.recipes ?? []).map((record) => cmsRecipeToRecipe(record)));
        setShadowedSlugs(body.shadowedSlugs ?? []);
      })
      .catch(() => undefined);
    void fetch("/api/public/reviews", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ reviews?: RecipeReview[] }> : { reviews: [] })
      .then((body) => setApprovedReviews(body.reviews ?? []))
      .catch(() => undefined);
    window.addEventListener(COMMUNITY_REVIEWS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      controller.abort();
      window.removeEventListener(COMMUNITY_REVIEWS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const allRecipes = useMemo(() => {
    const hidden = new Set(shadowedSlugs);
    return mergeRecipesBySlug(recipes.filter((recipe) => !hidden.has(recipe.slug)), publishedRecipes);
  }, [publishedRecipes, shadowedSlugs]);
  const serverOnlyReviews = useMemo(() => approvedReviews.filter((remote) => !localReviews.some((local) => local.name === remote.name && local.comment === remote.comment)), [approvedReviews, localReviews]);
  // Hanya ulasan pengunjung (lokal + hasil moderasi) yang dipakai sebagai bukti;
  // ulasan contoh tidak ikut analisis, hanya tampil sebagai contoh berlabel.
  const allReviews = useMemo(() => [...localReviews.map(sebagaiUlasanPublik), ...serverOnlyReviews], [localReviews, serverOnlyReviews]);
  const result = useMemo(() => buildExpertBlend(selectedIds, preferences, allReviews, allRecipes), [selectedIds, preferences, allReviews, allRecipes]);
  // Wilayah harga mengikuti provinsi pengunjung; tanpa provinsi dipakai harga dasar nasional.
  const wilayah = useMemo(() => wilayahUntukProvinsi(preferences.province), [preferences.province]);
  const hargaTabel = useMemo(() => tabelHarga(wilayah), [wilayah]);
  const stats = getExpertKnowledgeStats(localReviews.length, allRecipes.length, serverOnlyReviews.length);

  function updatePreference(key: keyof UserPreferences, value: string) {
    if (key === "province") markLocationTouched();
    setPreferences((current) => ({ ...current, [key]: value }));
    saveVisitorPreferences({ [key]: value });
  }

  function toggleIngredient(id: string) {
    setNotice("");
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX_BLEND_INGREDIENTS) { setNotice(`Pilih maksimal ${MAX_BLEND_INGREDIENTS} bahan agar komposisi tetap mudah dievaluasi. Lepas satu bahan dulu kalau ingin menambah yang lain.`); return current; }
      return [...current, id];
    });
  }

  function analyze() {
    if (selectedIds.length < MIN_BLEND_INGREDIENTS) { setNotice(`Pilih minimal ${MIN_BLEND_INGREDIENTS} bahan untuk melihat contoh campuran.`); return; }
    setNotice("Analisis diperbarui dari pilihan bahan, resep, dan ulasan yang tersedia.");
    setAnalysisCount((current) => current + 1);
  }

  // Saran bisa berupa penggantian (peran sama, rasio aman) atau penambahan bahan
  // untuk memperbaiki porsi peran yang keluar dari aturan.
  function pakaiSaran(saran: BlendSuggestion, id: string) {
    if (!id) return;
    setNotice("");
    setSelectedIds((current) => {
      // Saran pengganti menukar bahan yang sama perannya; saran aturan menambah
      // satu bahan saja (tombol lain di saran yang sama tetap pilihan terpisah).
      if (saran.untukId && current.includes(saran.untukId)) {
        return [...new Set(current.map((bahanId) => (bahanId === saran.untukId ? id : bahanId)))];
      }
      if (current.includes(id) || current.length >= MAX_BLEND_INGREDIENTS) return current;
      return [...current, id];
    });
    setNotice(saran.untukId ? "Bahan pengganti dipakai; komposisi dihitung ulang otomatis." : "Saran bahan ditambahkan; komposisi dihitung ulang otomatis.");
    setAnalysisCount((current) => current + 1);
  }

  function pakaiHemat() {
    if (!result?.hemat) return;
    setSelectedIds(result.hemat.ids);
    setNotice("Versi hemat dipakai: bahan seperan yang lebih murah. Cek lagi tekstur dan aromanya saat mengaduk.");
    setAnalysisCount((current) => current + 1);
  }

  return (
    <div>
      <section className="relative isolate mb-8 overflow-hidden rounded-[28px] bg-[#1e3d2b] px-6 py-8 text-white sm:px-10 sm:py-11 lg:px-14"><div className="absolute -right-10 -top-20 -z-10 h-64 w-64 rounded-full border-[40px] border-white/[.045]" /><div className="absolute -bottom-32 right-1/3 -z-10 h-52 w-52 rounded-full border-[30px] border-[#dfbd6e]/[.08]" /><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-[#e2d2a5]"><BrainCircuit size={15} /> Sistem pakar berbasis aturan & bukti</span><h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-.045em] sm:text-5xl">Racik umpan dengan lebih terarah.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/72 sm:text-base">Pilih bahan yang ada di rumah, ceritakan kondisi kolam, lalu lihat contoh komposisi dan resep terdekat beserta alasannya.</p><div className="mt-6 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs"><Compass size={13} aria-hidden="true" /> Aturan kondisi</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs"><FlaskConical size={13} aria-hidden="true" /> Fungsi bahan</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs"><MessagesSquare size={13} aria-hidden="true" /> Bukti komunitas</span></div></section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(350px,.82fr)]">
        <section className="rounded-[25px] border border-[#e5eae2] bg-white p-4 shadow-[0_10px_32px_rgba(38,55,40,.045)] sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#626d61] (4.64:1 terburuk)">Langkah 1 · Konteks</p><h2 className="mt-1 text-lg font-extrabold text-[#2d3f31]">Ceritakan kondisi mancing</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef3e9] text-[#547253] (4.61:1 terburuk)"><Waves size={19} /></span></div>
          <div className="mt-4">
            <UseMyLocationButton onPlace={(place) => updatePreference("province", place.province)} label="Isi provinsi dari lokasi saya" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field label="Provinsi" icon={MapPin}><SelectBox><select className={selectClass} value={preferences.province} onChange={(event) => updatePreference("province", event.target.value)}><option value="">Pilih provinsi</option>{provinces.map((province) => <option key={province.slug}>{province.name}</option>)}</select></SelectBox></Field>
            <Field label="Cuaca" icon={Sparkles}><SelectBox><select className={selectClass} value={preferences.weather} onChange={(event) => updatePreference("weather", event.target.value)}>{["Hujan", "Mendung", "Cerah", "Berawan", "Panas"].map((item) => <option key={item}>{item}</option>)}</select></SelectBox></Field>
            <Field label="Tipe air" icon={Waves}><SelectBox><select className={selectClass} value={preferences.waterBody ?? ""} onChange={(event) => updatePreference("waterBody", event.target.value)}><option value="">Belum dipilih</option>{WATER_BODIES.map((item) => <option key={item}>{item}</option>)}</select></SelectBox></Field>
            <Field label="Kondisi air" icon={Droplets}><SelectBox><select className={selectClass} value={preferences.water} onChange={(event) => updatePreference("water", event.target.value)}>{["Keruh", "Hijau", "Jernih", "Kekuningan"].map((item) => <option key={item}>{item}</option>)}</select></SelectBox></Field>
            <Field label="Jenis pemancingan" icon={Fish}><SelectBox><select className={selectClass} value={preferences.fishingType} onChange={(event) => updatePreference("fishingType", event.target.value)}>{["Harian", "Lomba", "Galatama"].map((item) => <option key={item}>{item}</option>)}</select></SelectBox></Field>
            <Field label="Budget racikan" icon={Beaker}><SelectBox><select title="Dipakai menyaring alternatif resep sekaligus menilai perkiraan biaya racikan dari komposisi." className={selectClass} value={preferences.budget} onChange={(event) => updatePreference("budget", event.target.value)}>{["< Rp15.000", "Rp15.000–30.000", "Rp30.000–50.000", "> Rp50.000"].map((item) => <option key={item}>{item}</option>)}</select></SelectBox></Field>
            <Field label="Musim" icon={Waves}><SelectBox><select className={selectClass} value={preferences.season} onChange={(event) => updatePreference("season", event.target.value)}>{["Musim Hujan", "Musim Panas", "Kemarau", "Peralihan"].map((item) => <option key={item}>{item}</option>)}</select></SelectBox></Field>
          </div>
          <details className="mt-5 rounded-2xl border border-[#e6eae3] bg-[#fbfcf9] px-4 py-3">
            <summary className="cursor-pointer text-xs font-extrabold text-[#405341]">Dari mana angka kecocokan ini?</summary>
            <p className="mt-2 text-[11px] leading-5 text-[#626c62] (4.69:1 terburuk)">Skor memakai bobot berikut (total 100), semuanya dari isianmu sendiri — tidak ada angka katalog yang dihitung. Versi bobot: {MATCH_WEIGHTS_VERSION}.</p>
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {MATCH_WEIGHT_ENTRIES.map((item) => <li key={item.key} className="rounded-xl bg-white px-3 py-2 text-[11px] leading-5 text-[#636d63] (4.62:1 terburuk)"><strong className="font-extrabold text-[#405341]">{item.label} {item.bobot}</strong> — {item.alasan}</li>)}
            </ul>
          </details>
          <div className="mb-3 mt-7 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#626d61] (4.64:1 terburuk)">Langkah 2 · Bahan</p><h2 className="mt-1 text-lg font-extrabold text-[#2d3f31]">Apa yang tersedia?</h2></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${selectedIds.length >= MAX_BLEND_INGREDIENTS ? "bg-[#f6ecd9] text-[#826630] (4.63:1 terburuk)" : "bg-[#eef3e9] text-[#507151]"}`}>{selectedIds.length}/{MAX_BLEND_INGREDIENTS} dipilih{selectedIds.length < MAX_BLEND_INGREDIENTS ? ` · sisa ${MAX_BLEND_INGREDIENTS - selectedIds.length} slot` : " · penuh"}</span></div>
          <p className="mb-4 text-xs leading-5 text-[#666d64] (4.58:1 terburuk)">{BLEND_LIMITS_SUMMARY} Tiap peran punya rentang rasio sendiri supaya adonan tidak didominasi satu fungsi.</p>
          <div className="grid gap-4">
            {BLEND_ROLE_RULES.map((rule) => {
              const bahanPeran = ingredientKnowledge.filter((item) => item.role === rule.role);
              if (!bahanPeran.length) return null;
              const dipilihPeran = bahanPeran.filter((item) => selectedIds.includes(item.id));
              return (
                <div key={rule.role}>
                  <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-extrabold text-[#5f6f5f]">{rule.role} <span className="font-semibold text-[#98a096]">· aturan {ruleRangeLabel(rule)} · {bahanPeran.length} bahan</span></p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${dipilihPeran.length ? "bg-[#eef3e9] text-[#507151]" : "bg-[#f4f4f1] text-[#9aa197]"}`}>{dipilihPeran.length} dipilih</span></div>
                  <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">{bahanPeran.map((item) => <IngredientOption key={item.id} item={item} selected={selectedIds.includes(item.id)} disabled={!selectedIds.includes(item.id) && selectedIds.length >= MAX_BLEND_INGREDIENTS} onClick={() => toggleIngredient(item.id)} />)}</div>
                </div>
              );
            })}
          </div>
          <details className="mt-5 rounded-2xl border border-[#e6eae3] bg-[#fbfcf9] px-4 py-3">
            <summary className="cursor-pointer text-xs font-extrabold text-[#405341]">Aturan rasio per peran &amp; batas pilihan bahan</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[430px] border-collapse text-left text-[11px]">
                <thead><tr className="text-[10px] uppercase tracking-[.08em] text-[#666d65] (4.57:1 terburuk)"><th className="pb-1.5 pr-2 font-bold">Peran</th><th className="pb-1.5 pr-2 font-bold">Rasio</th><th className="pb-1.5 font-bold">Alasannya</th></tr></thead>
                <tbody>{BLEND_ROLE_RULES.map((rule) => <tr key={rule.role} className="border-t border-[#ecefe9] align-top"><td className="py-2 pr-2 font-extrabold text-[#405341]">{rule.role}</td><td className="py-2 pr-2 font-bold text-[#567256] (4.58:1 terburuk)">{rule.minPercent}–{rule.maxPercent}%</td><td className="py-2 text-[#636d63] (4.62:1 terburuk)">{rule.alasan}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="mt-3 text-[10px] leading-5 text-[#626c62] (4.69:1 terburuk)">{BLEND_RULES_SUMMARY}</p>
            <p className="mt-2 text-[10px] leading-5 text-[#626c62] (4.69:1 terburuk)">Batas pilihan: {MIN_BLEND_INGREDIENTS}–{MAX_BLEND_INGREDIENTS} bahan dari {ingredientKnowledge.length} bahan yang tersedia, satu bahan minimal {MIN_INGREDIENT_PERCENT}% supaya berpengaruh nyata. Sistem mengelompokkan bahan per peran, bukan menjumlahkan persentase satu per satu.</p>
          </details>
          <details className="mt-3 rounded-2xl border border-[#e6eae3] bg-[#fbfcf9] px-4 py-3">
            <summary className="cursor-pointer text-xs font-extrabold text-[#405341]">Perkiraan harga bahan per wilayah</summary>
            <p className="mt-2 text-[11px] leading-5 text-[#626c62] (4.69:1 terburuk)">Estimasi biaya di panel hasil dihitung dari komposisi memakai tabel ini ({PRICE_UPDATED_AT}). {PRICE_FACTOR_NOTE}</p>
            <p className="mt-2 text-[11px] font-bold text-[#405341]">{wilayahLabel(wilayah)} · faktor harga {WILAYAH_FACTOR[wilayah].toFixed(2)}×</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[430px] border-collapse text-left text-[11px]">
                <thead><tr className="text-[10px] uppercase tracking-[.08em] text-[#666d65] (4.57:1 terburuk)"><th className="pb-1.5 pr-2 font-bold">Bahan</th><th className="pb-1.5 pr-2 font-bold">Satuan</th><th className="pb-1.5 pr-2 font-bold">Dasar (nasional)</th><th className="pb-1.5 font-bold">Di wilayah ini</th></tr></thead>
                <tbody>{hargaTabel.map((baris) => <tr key={baris.id} className="border-t border-[#ecefe9]"><td className="py-1.5 pr-2 font-bold text-[#405341]">{namaBahan(baris.id)}</td><td className="py-1.5 pr-2 text-[#626c62] (4.69:1 terburuk)">{baris.satuan}</td><td className="py-1.5 pr-2 text-[#636d63] (4.62:1 terburuk)">{formatRupiah(baris.nasional)}</td><td className="py-1.5 font-bold text-[#567256] (4.58:1 terburuk)">{formatRupiah(baris.wilayah)}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-[#726952] (4.67:1 terburuk)">{PRICE_NOTE}</p>
          </details>
          <button type="button" onClick={analyze} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-extrabold text-white transition hover:bg-[#203d29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294b34]"><Sparkles size={16} /> Analisis racikan saya</button>
          {notice && <p role="status" className="mt-3 rounded-xl bg-[#f1f5ee] px-3.5 py-2.5 text-xs font-semibold text-[#506a50]">{notice}{analysisCount > 0 && selectedIds.length >= 2 ? ` · Analisis ${analysisCount}` : ""}</p>}
          <p className="mt-3 text-[10px] leading-5 text-[#9aa197]">Rasio adalah titik awal untuk uji kecil, bukan formula universal. Cairan ditambahkan perlahan sampai tekstur sesuai.</p>
        </section>

        <section className="space-y-5">
          <div className="overflow-hidden rounded-[25px] border border-[#dfe7db] bg-white shadow-[0_12px_36px_rgba(38,55,40,.07)]">
            <div className="bg-[#f3f7f0] px-5 py-5 sm:px-6"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#626d61] (4.64:1 terburuk)">Hasil sistem pakar · contoh 100 g</p><h2 className="mt-1 text-xl font-black tracking-tight text-[#2b3c2e]">{result?.title ?? "Pilih minimal dua bahan"}</h2></div><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#537251]"><Beaker size={20} /></span></div><p className="mt-2 text-xs leading-5 text-[#626c62] (4.69:1 terburuk)">Porsi per peran dibagi ulang agar masuk rentang aturan, lalu diperiksa terhadap budget dan perkiraan harga bahan di wilayahmu. Cek ketersediaan dan kondisi adonan sebelum meracik.</p></div>
            {result ? <div className="p-5 sm:p-6"><div className="space-y-3">{result.ingredients.map((item, index) => <div key={item.id}><div className="mb-1.5 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><IngredientIcon id={item.icon} size={14} className="shrink-0 text-[#547056] (4.71:1 terburuk)" /><span className="truncate text-sm font-bold text-[#3b4d3e]">{item.name}</span><span className="hidden rounded-full bg-[#f3f5f1] px-2 py-0.5 text-[9px] font-semibold text-[#646c63] (4.66:1 terburuk) sm:inline">{item.role}</span></div><span className="shrink-0 text-sm font-extrabold text-[#405341]">{item.grams} g <span className="text-xs font-semibold text-[#91998f]">({item.percent}%)</span></span></div><div className="h-2 overflow-hidden rounded-full bg-[#eef1eb]"><div className={`h-full rounded-full ${ratioColors[index % ratioColors.length]}`} style={{ width: `${item.percent}%` }} /></div>{item.rupiah > 0 && <p className="mt-1 text-[10px] text-[#98a096]">≈ {formatRupiah(item.rupiah)} untuk porsi ini</p>}</div>)}</div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f5f7f3] px-3.5 py-3"><span className="text-xs font-bold text-[#626e61] (4.59:1 terburuk)">Total campuran kering</span><span className="text-sm font-black text-[#31593a]">{result.basisGram} g</span></div>
              <div className="mt-2 rounded-xl bg-[#f5f7f3] px-3.5 py-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-[#626e61] (4.59:1 terburuk)">Perkiraan biaya dari komposisi</span><span className="text-sm font-black text-[#31593a]">{formatRupiah(result.cost100g.total)}</span></div><p className="mt-1 text-[10px] leading-5 text-[#98a096]">{result.wilayahLabel} · satu sesi (± {result.sesiGram} g) ≈ {formatRupiah(result.costSesi.total)}. {result.cost100g.catatan} {SESI_NOTE}</p></div>
              <div className="mt-4 rounded-2xl border border-[#e9ede6] bg-white p-3.5"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#626d61] (4.64:1 terburuk)">Porsi per peran vs aturan</p><div className="mt-2.5 space-y-2.5">{result.roleShares.map((share) => <div key={share.role} className="grid grid-cols-[86px_1fr_auto] items-center gap-2"><span className="text-[11px] font-bold text-[#405341]">{share.role}</span><div className="h-1.5 overflow-hidden rounded-full bg-[#eef1eb]"><div className={`h-full rounded-full ${share.status === "sesuai" ? "bg-[#5c7f59]" : share.status === "tidak-dipakai" ? "bg-[#d9ded6]" : "bg-[#d3b45f]"}`} style={{ width: `${share.percent}%` }} /></div><span className={`text-[10px] font-bold ${share.status === "sesuai" ? "text-[#507151]" : share.status === "tidak-dipakai" ? "text-[#9aa197]" : "text-[#846428] (4.70:1 terburuk)"}`}>{share.percent}% · aturan {share.min}–{share.max}% · {STATUS_PERAN[share.status]}</span></div>)}</div></div>
              {result.suggestions.length > 0 && <div className="mt-4 rounded-2xl border border-[#e4eae0] bg-[#fbfcf8] p-3.5"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#626d61] (4.64:1 terburuk)">Saran pengganti &amp; komposisi lain</p><ul className="mt-2.5 space-y-2.5">{result.suggestions.map((saran, index) => <li key={`${saran.jenis}-${index}`} className="rounded-xl bg-white p-3"><p className="text-xs font-extrabold text-[#38483a]">{saran.judul}</p>{saran.detail && <p className="mt-1 text-[11px] leading-5 text-[#646e64] (4.55:1 terburuk)">{saran.detail}</p>}{saran.penggantiIds.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{saran.penggantiIds.map((id) => <button key={id} type="button" onClick={() => pakaiSaran(saran, id)} className="inline-flex items-center gap-1 rounded-full border border-[#cfdcc9] bg-[#f4f8f1] px-2.5 py-1 text-[10px] font-bold text-[#4c6b4d] transition hover:border-[#9dba97] hover:bg-[#eaf2e6]">Pakai {namaBahan(id)}</button>)}</div>}</li>)}</ul>{result.hemat && <button type="button" onClick={pakaiHemat} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#cfdcc9] bg-white px-4 text-xs font-extrabold text-[#3f5f42] transition hover:bg-[#f4f8f1]">Terapkan versi hemat · {formatRupiah(result.hemat.totalSesi)} per sesi (hemat {formatRupiah(result.hemat.selisihSesi)})</button>}</div>}
              {result.warnings.map((warning) => <p key={warning} className="mt-3 flex items-start gap-2 rounded-xl border border-[#f0e7d6] bg-[#fcf9f1] px-3.5 py-3 text-xs leading-5 text-[#756951] (4.62:1 terburuk)"><Info size={14} className="mt-0.5 shrink-0 text-[#7f673a] (4.62:1 terburuk)" />{warning}</p>)}
            </div> : <div className="p-6 text-sm text-[#636d63] (4.62:1 terburuk)">Tentukan bahan pilihanmu untuk melihat simulasi campuran.</div>}
          </div>

          {result && <div className="rounded-[24px] border border-[#e6eae3] bg-white p-5 sm:p-6"><div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#626d61] (4.64:1 terburuk)">Cara membaca hasil</p><h3 className="mt-1 text-base font-extrabold text-[#334437]">Alasan rekomendasi</h3></div><ul className="space-y-3">{result.reasoning.map((reason, index) => <li key={reason} className="flex gap-2.5 text-xs leading-5 text-[#616d61] (4.66:1 terburuk)"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#edf3e9] text-[9px] font-extrabold text-[#567256] (4.58:1 terburuk)">{index + 1}</span>{reason}</li>)}</ul><div className="mt-4 rounded-xl bg-[#f7f8f4] px-3.5 py-3 text-[11px] leading-5 text-[#666d63] (4.58:1 terburuk)">{result.evidenceCount ? `${result.evidenceCount} ulasan pengunjung pada resep terkait ikut diperiksa.` : "Belum ada ulasan pengunjung pada resep alternatif teratas; sistem memakai kecocokan bahan dan kondisi kolam."}</div></div>}
        </section>
      </div>

      {result && <section className="mt-10"><SectionHeader eyebrow="Diperiksa terhadap koleksi resep" title="Resep paling mendekati pilihanmu" subtitle="Ranking menggabungkan kecocokan kondisi, kemiripan bahan, rating, dan ulasan pada kondisi serupa." /><div className="grid gap-3 md:grid-cols-3">{result.recipeMatches.map((item, index) => <ExpertRecipeEvidence key={item.recipe.slug} result={item} index={index} />)}</div></section>}

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-[24px] border border-[#e4e9e1] bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf2e9] text-[#527052]"><BookOpenCheck size={19} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#656c62] (4.65:1 terburuk)">Basis pengetahuan</p><h2 className="mt-0.5 text-base font-extrabold text-[#354739]">Sumber rekomendasi yang transparan</h2></div></div><p className="mt-3 text-xs leading-6 text-[#646e64] (4.55:1 terburuk)">{getKnowledgeEvidenceDescription(localReviews.length, allRecipes.length, serverOnlyReviews.length)} Skor konteks hanya memakai isian pengunjung ({MATCH_WEIGHT_ENTRIES.map((item) => `${item.label.toLowerCase()} ${item.bobot}`).join(", ")}). Kecocokan bahan serta ulasan membantu menyusun urutan resep — lihat catatan “Dari mana angka kecocokan ini?”.</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ label: "Resep", count: stats.recipes, icon: BookOpenCheck }, { label: "Bahan", count: stats.ingredients, icon: Beaker }, { label: "Ulasan asli", count: stats.reviews, icon: MessageSquareText }, { label: "Laporan", count: stats.reports, icon: Fish }].map(({ label, count, icon: Icon }) => <div key={label} className="rounded-xl bg-[#f6f8f4] p-3"><Icon size={15} className="text-[#5c6f59] (4.65:1 terburuk)" /><p className="mt-2 text-lg font-black text-[#354739]">{count}</p><p className="text-[10px] font-semibold text-[#656d65] (4.59:1 terburuk)">{label}</p></div>)}</div></div>
        <div className="rounded-[24px] bg-[#203e2c] p-5 text-white sm:p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#e0d09f]"><BrainCircuit size={20} /></span><h2 className="mt-4 text-base font-extrabold">Pengetahuan bertambah dari masukan</h2><p className="mt-2 text-xs leading-6 text-white/70">Resep katalog, fungsi bahan, laporan mancing, dan ulasan pengunjung menjadi basis aturan. Ulasan yang sudah disetujui editor ikut memperbarui urutan rekomendasi.</p><p className="mt-3 rounded-xl bg-white/[.08] px-3 py-2.5 text-[10px] leading-5 text-white/60">Ulasan kiriman pengunjung tersimpan di server dan tampil setelah disetujui; ulasan contoh berlabel tidak ikut dihitung. Tidak ada pelatihan model otomatis atau klaim hasil tangkapan.</p><Link href="/katalog?tab=komunitas" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#e6d6a9] hover:underline">Jelajahi cerita pemancing <ArrowRight size={13} /></Link></div>
      </section>
      <div className="mt-6 rounded-xl border border-[#e7eae3] bg-[#f7f8f5] px-4 py-3 text-[11px] leading-5 text-[#646d63] (4.61:1 terburuk)">Saran bahan adalah ilustrasi edukatif untuk umpan ikan mas, bukan formula baku. Sesuaikan takaran, patuhi aturan kolam, dan uji dalam porsi kecil karena respons ikan berbeda.</div>
    </div>
  );
}
