"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Beaker, BookOpenCheck, BrainCircuit, Check, Droplets, Fish, Info, MapPin, MessageSquareText, Sparkles, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ingredientKnowledge, type IngredientKnowledge } from "@/data/ingredient-knowledge";
import { recipes, defaultPreferences, type FishingType, type Recipe, type Weather, type WaterCondition } from "@/data/recipes";
import { provinces } from "@/data/provinces";
import { reviews, type RecipeReview } from "@/data/reviews";
import type { CmsRecipeRecord } from "@/lib/cms";
import { cmsRecipeToRecipe, mergeRecipesBySlug } from "@/lib/cms";
import { COMMUNITY_REVIEWS_EVENT, readCommunityReviews } from "@/lib/community-storage";
import { buildExpertBlend, getExpertKnowledgeStats, getKnowledgeEvidenceDescription } from "@/lib/expert-system";
import type { UserPreferences } from "@/lib/recommendation";
import { Badge, SectionHeader } from "@/components/shared";

const selectClass = "min-h-11 w-full rounded-xl border border-[#e3e8e1] bg-white px-3 text-sm font-semibold text-[#3d4d3f] outline-none transition focus:border-[#718b70] focus:ring-4 focus:ring-[#365b3a]/10";
const ratioColors = ["bg-[#315b3c]", "bg-[#638363]", "bg-[#a7b78d]", "bg-[#d3b45f]", "bg-[#9a7449]", "bg-[#839d9a]"];
const initialIngredients = ["pelet-ikan", "tepung-tapioka", "kroto", "susu-bubuk"];

function Field({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: ReactNode }) {
  return <label className="grid gap-1.5 text-xs font-bold text-[#738071]"><span className="inline-flex items-center gap-1.5"><Icon size={13} /> {label}</span>{children}</label>;
}

function IngredientOption({ item, selected, onClick }: { item: IngredientKnowledge; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={`relative min-h-[98px] rounded-2xl border p-3.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31593a] ${selected ? "border-[#5c7f59] bg-[#f1f6ee] shadow-[0_0_0_2px_rgba(63,103,63,.07)]" : "border-[#e7ebe5] bg-white hover:border-[#cbd8c8] hover:bg-[#fafcf9]"}`}>
      <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full border border-[#dce4d9] bg-white">{selected && <Check size={12} className="text-[#3d6941]" />}</span>
      <span className="text-xl" aria-hidden="true">{item.emoji}</span><span className="mt-2 block pr-5 text-sm font-extrabold text-[#344638]">{item.name}</span><span className="mt-1 inline-flex rounded-full bg-[#f2f4ef] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] text-[#7d887a]">{item.role}</span>
    </button>
  );
}

function ExpertRecipeEvidence({ result, index }: { result: NonNullable<ReturnType<typeof buildExpertBlend>>["recipeMatches"][number]; index: number }) {
  const medal = ["🥇", "🥈", "🥉"][index] ?? "•";
  return (
    <Link href={`/resep/${result.recipe.slug}`} className="group flex items-center gap-3 rounded-2xl border border-[#e5eae3] bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-[#cbd8c8] hover:shadow-sm">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f5f5ef] text-lg">{medal}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-[#334437] group-hover:text-[#315c3b]">{result.recipe.name}</p><p className="mt-1 text-[10px] text-[#8b9489]">Bahan {result.ingredientFit}% · Bukti komunitas {result.communityFit}%</p></div>
      <span className="shrink-0 text-right"><strong className="block text-lg leading-none text-[#31593a]">{result.score}%</strong><small className="text-[9px] font-bold uppercase tracking-wider text-[#929a91]">match</small></span>
    </Link>
  );
}

export function ExpertSystem() {
  const [preferences, setPreferences] = useState<UserPreferences>({ ...defaultPreferences });
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIngredients);
  const [localReviews, setLocalReviews] = useState<ReturnType<typeof readCommunityReviews>>([]);
  const [publishedRecipes, setPublishedRecipes] = useState<Recipe[]>([]);
  const [shadowedSlugs, setShadowedSlugs] = useState<string[]>([]);
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
  const allReviews = useMemo(() => [...reviews, ...localReviews, ...serverOnlyReviews], [localReviews, serverOnlyReviews]);
  const result = useMemo(() => buildExpertBlend(selectedIds, preferences, allReviews, allRecipes), [selectedIds, preferences, allReviews, allRecipes]);
  const stats = getExpertKnowledgeStats(localReviews.length, allRecipes.length, serverOnlyReviews.length);

  function updatePreference(key: keyof UserPreferences, value: string) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function toggleIngredient(id: string) {
    setNotice("");
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 6) { setNotice("Pilih maksimal 6 bahan agar komposisi tetap mudah dievaluasi."); return current; }
      return [...current, id];
    });
  }

  function analyze() {
    if (selectedIds.length < 2) { setNotice("Pilih minimal 2 bahan untuk melihat contoh campuran."); return; }
    setNotice("Analisis diperbarui dari pilihan bahan, resep, dan ulasan yang tersedia.");
    setAnalysisCount((current) => current + 1);
  }

  return (
    <div>
      <section className="relative isolate mb-8 overflow-hidden rounded-[28px] bg-[#1e3d2b] px-6 py-8 text-white sm:px-10 sm:py-11 lg:px-14"><div className="absolute -right-10 -top-20 -z-10 h-64 w-64 rounded-full border-[40px] border-white/[.045]" /><div className="absolute -bottom-32 right-1/3 -z-10 h-52 w-52 rounded-full border-[30px] border-[#dfbd6e]/[.08]" /><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-[#e2d2a5]"><BrainCircuit size={15} /> Sistem pakar berbasis aturan & bukti</span><h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-.045em] sm:text-5xl">Racik umpan dengan lebih terarah.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/72 sm:text-base">Pilih bahan yang ada di rumah, ceritakan kondisi kolam, lalu lihat contoh komposisi dan resep terdekat beserta alasannya.</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-2 text-xs">🧭 Aturan kondisi</span><span className="rounded-full bg-white/10 px-3 py-2 text-xs">🧪 Fungsi bahan</span><span className="rounded-full bg-white/10 px-3 py-2 text-xs">💬 Bukti komunitas</span></div></section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(350px,.82fr)]">
        <section className="rounded-[25px] border border-[#e5eae2] bg-white p-4 shadow-[0_10px_32px_rgba(38,55,40,.045)] sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#839080]">Langkah 1 · Konteks</p><h2 className="mt-1 text-lg font-extrabold text-[#2d3f31]">Ceritakan kondisi mancing</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef3e9] text-[#567455]"><Waves size={19} /></span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field label="Provinsi" icon={MapPin}><select className={selectClass} value={preferences.province} onChange={(event) => updatePreference("province", event.target.value)}>{provinces.map((province) => <option key={province.slug}>{province.name}</option>)}</select></Field>
            <Field label="Cuaca" icon={Sparkles}><select className={selectClass} value={preferences.weather} onChange={(event) => updatePreference("weather", event.target.value)}>{["Hujan", "Mendung", "Cerah", "Berawan", "Panas"].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Kondisi air" icon={Droplets}><select className={selectClass} value={preferences.water} onChange={(event) => updatePreference("water", event.target.value)}>{["Keruh", "Hijau", "Jernih", "Kekuningan"].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Jenis pemancingan" icon={Fish}><select className={selectClass} value={preferences.fishingType} onChange={(event) => updatePreference("fishingType", event.target.value)}>{["Harian", "Lomba", "Galat"].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Budget racikan" icon={Beaker}><select className={selectClass} value={preferences.budget} onChange={(event) => updatePreference("budget", event.target.value)}>{["< Rp15.000", "Rp15.000–30.000", "Rp30.000–50.000", "> Rp50.000"].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Musim" icon={Waves}><select className={selectClass} value={preferences.season} onChange={(event) => updatePreference("season", event.target.value)}>{["Musim Hujan", "Musim Panas", "Kemarau", "Peralihan"].map((item) => <option key={item}>{item}</option>)}</select></Field>
          </div>
          <div className="mb-3 mt-7 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#839080]">Langkah 2 · Bahan</p><h2 className="mt-1 text-lg font-extrabold text-[#2d3f31]">Apa yang tersedia?</h2></div><span className="rounded-full bg-[#eef3e9] px-3 py-1.5 text-xs font-bold text-[#507151]">{selectedIds.length}/6 dipilih</span></div>
          <p className="mb-4 text-xs leading-5 text-[#879085]">Pilih minimal 2 bahan. Sistem mengelompokkan fungsi bahan lalu menyeimbangkan komposisi untuk contoh adonan 100 g.</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{ingredientKnowledge.map((item) => <IngredientOption key={item.id} item={item} selected={selectedIds.includes(item.id)} onClick={() => toggleIngredient(item.id)} />)}</div>
          <button type="button" onClick={analyze} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-extrabold text-white transition hover:bg-[#203d29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294b34]"><Sparkles size={16} /> Analisis racikan saya</button>
          {notice && <p role="status" className="mt-3 rounded-xl bg-[#f1f5ee] px-3.5 py-2.5 text-xs font-semibold text-[#506a50]">{notice}{analysisCount > 0 && selectedIds.length >= 2 ? ` · Analisis ${analysisCount}` : ""}</p>}
          <p className="mt-3 text-[10px] leading-5 text-[#9aa197]">Rasio adalah titik awal untuk uji kecil, bukan formula universal. Cairan ditambahkan perlahan sampai tekstur sesuai.</p>
        </section>

        <section className="space-y-5">
          <div className="overflow-hidden rounded-[25px] border border-[#dfe7db] bg-white shadow-[0_12px_36px_rgba(38,55,40,.07)]">
            <div className="bg-[#f3f7f0] px-5 py-5 sm:px-6"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#829180]">Hasil sistem pakar · contoh 100 g</p><h2 className="mt-1 text-xl font-black tracking-tight text-[#2b3c2e]">{result?.title ?? "Pilih minimal dua bahan"}</h2></div><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#537251]"><Beaker size={20} /></span></div><p className="mt-2 text-xs leading-5 text-[#7d887b]">Komposisi dinormalisasi berdasarkan fungsi bahan. Cek ketersediaan dan kondisi adonan sebelum meracik.</p></div>
            {result ? <div className="p-5 sm:p-6"><div className="space-y-3">{result.ingredients.map((item, index) => <div key={item.id}><div className="mb-1.5 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span aria-hidden="true">{item.emoji}</span><span className="truncate text-sm font-bold text-[#3b4d3e]">{item.name}</span><span className="hidden rounded-full bg-[#f3f5f1] px-2 py-0.5 text-[9px] font-semibold text-[#828b80] sm:inline">{item.role}</span></div><span className="shrink-0 text-sm font-extrabold text-[#405341]">{item.grams} g <span className="text-xs font-semibold text-[#91998f]">({item.percent}%)</span></span></div><div className="h-2 overflow-hidden rounded-full bg-[#eef1eb]"><div className={`h-full rounded-full ${ratioColors[index % ratioColors.length]}`} style={{ width: `${item.percent}%` }} /></div></div>)}</div><div className="mt-4 flex items-center justify-between rounded-xl bg-[#f5f7f3] px-3.5 py-3"><span className="text-xs font-bold text-[#667365]">Total campuran kering</span><span className="text-sm font-black text-[#31593a]">100 g</span></div>
              {result.warnings.map((warning) => <p key={warning} className="mt-3 flex items-start gap-2 rounded-xl border border-[#f0e7d6] bg-[#fcf9f1] px-3.5 py-3 text-xs leading-5 text-[#776b53]"><Info size={14} className="mt-0.5 shrink-0 text-[#a08249]" />{warning}</p>)}
            </div> : <div className="p-6 text-sm text-[#788378]">Tentukan bahan pilihanmu untuk melihat simulasi campuran.</div>}
          </div>

          {result && <div className="rounded-[24px] border border-[#e6eae3] bg-white p-5 sm:p-6"><div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#839080]">Cara membaca hasil</p><h3 className="mt-1 text-base font-extrabold text-[#334437]">Alasan rekomendasi</h3></div><ul className="space-y-3">{result.reasoning.map((reason, index) => <li key={reason} className="flex gap-2.5 text-xs leading-5 text-[#657265]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#edf3e9] text-[9px] font-extrabold text-[#587458]">{index + 1}</span>{reason}</li>)}</ul><div className="mt-4 rounded-xl bg-[#f7f8f4] px-3.5 py-3 text-[11px] leading-5 text-[#879084]">{result.evidenceCount ? `${result.evidenceCount} ulasan pada resep terkait ikut diperiksa.` : "Belum ada ulasan pada resep alternatif teratas; sistem menggunakan rating katalog sampai ada masukan baru."}</div></div>}
        </section>
      </div>

      {result && <section className="mt-10"><SectionHeader eyebrow="Diperiksa terhadap koleksi resep" title="Resep paling mendekati pilihanmu" subtitle="Ranking menggabungkan kecocokan kondisi, kemiripan bahan, rating, dan ulasan pada kondisi serupa." /><div className="grid gap-3 md:grid-cols-3">{result.recipeMatches.map((item, index) => <ExpertRecipeEvidence key={item.recipe.slug} result={item} index={index} />)}</div></section>}

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-[24px] border border-[#e4e9e1] bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf2e9] text-[#527052]"><BookOpenCheck size={19} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#899286]">Basis pengetahuan</p><h2 className="mt-0.5 text-base font-extrabold text-[#354739]">Sumber rekomendasi yang transparan</h2></div></div><p className="mt-3 text-xs leading-6 text-[#778276]">{getKnowledgeEvidenceDescription(localReviews.length, allRecipes.length, serverOnlyReviews.length)} Skor konteks: air 25, cuaca 20, jenis pemancingan 20, provinsi 15, musim 10, rating 5, dan popularitas 5. Kecocokan bahan serta ulasan membantu menyusun urutan resep.</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ label: "Resep", count: stats.recipes, icon: BookOpenCheck }, { label: "Bahan", count: stats.ingredients, icon: Beaker }, { label: "Ulasan", count: stats.reviews, icon: MessageSquareText }, { label: "Laporan", count: stats.reports, icon: Fish }].map(({ label, count, icon: Icon }) => <div key={label} className="rounded-xl bg-[#f6f8f4] p-3"><Icon size={15} className="text-[#6f866c]" /><p className="mt-2 text-lg font-black text-[#354739]">{count}</p><p className="text-[10px] font-semibold text-[#8a9389]">{label}</p></div>)}</div></div>
        <div className="rounded-[24px] bg-[#203e2c] p-5 text-white sm:p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#e0d09f]"><BrainCircuit size={20} /></span><h2 className="mt-4 text-base font-extrabold">Pengetahuan bertambah dari masukan</h2><p className="mt-2 text-xs leading-6 text-white/70">Resep katalog, fungsi bahan, laporan mancing, dan ulasan menjadi basis aturan. Ulasan baru langsung memperbarui sinyal rekomendasi di browser ini.</p><p className="mt-3 rounded-xl bg-white/[.08] px-3 py-2.5 text-[10px] leading-5 text-white/60">MVP tanpa backend: ulasan disimpan lokal di perangkat/browser ini, belum dibagikan ke seluruh pengguna. Tidak ada pelatihan model otomatis atau klaim hasil tangkapan.</p><Link href="/komunitas" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#e6d6a9] hover:underline">Jelajahi cerita pemancing <ArrowRight size={13} /></Link></div>
      </section>
      <div className="mt-6 rounded-xl border border-[#e7eae3] bg-[#f7f8f5] px-4 py-3 text-[11px] leading-5 text-[#7f897e]">Saran bahan adalah ilustrasi edukatif untuk umpan ikan mas, bukan formula baku. Sesuaikan takaran, patuhi aturan kolam, dan uji dalam porsi kecil karena respons ikan berbeda.</div>
    </div>
  );
}
