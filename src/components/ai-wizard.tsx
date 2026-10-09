"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Cloud, CloudRain, CloudSun, Droplets, MapPin, RotateCcw, Sparkles, Sun, Waves } from "lucide-react";
import { defaultPreferences, recipes, type FishingType, type Recipe, type Weather, type WaterCondition } from "@/data/recipes";
import { provinces } from "@/data/provinces";
import { reviews, type RecipeReview } from "@/data/reviews";
import type { CmsRecipeRecord } from "@/lib/cms";
import { cmsRecipeToRecipe, mergeRecipesBySlug } from "@/lib/cms";
import { COMMUNITY_REVIEWS_EVENT, readCommunityReviews } from "@/lib/community-storage";
import { rankExpertRecipes } from "@/lib/expert-system";
import { RecommendationCard } from "@/components/cards";
import { FavoriteButton } from "@/components/favorite-button";
import { Badge, SectionHeader } from "@/components/shared";
import type { UserPreferences } from "@/lib/recommendation";

const weatherOptions: { label: Weather; emoji: string; icon: typeof Cloud }[] = [
  { label: "Hujan", emoji: "🌧️", icon: CloudRain },
  { label: "Mendung", emoji: "☁️", icon: Cloud },
  { label: "Cerah", emoji: "☀️", icon: Sun },
  { label: "Berawan", emoji: "🌤️", icon: CloudSun },
];
const waterOptions: { label: WaterCondition; emoji: string; note: string }[] = [
  { label: "Jernih", emoji: "💎", note: "Terlihat dasar / bening" },
  { label: "Hijau", emoji: "🟢", note: "Kehijauan atau berlumut" },
  { label: "Keruh", emoji: "🟤", note: "Visibilitas rendah" },
  { label: "Kekuningan", emoji: "🟡", note: "Air berwarna kuning" },
];
const typeOptions: { label: FishingType; emoji: string; note: string }[] = [
  { label: "Harian", emoji: "🎣", note: "Mancing santai" },
  { label: "Lomba", emoji: "🏆", note: "Kompetisi / lomba" },
  { label: "Galat", emoji: "🔥", note: "Kolam galatama" },
];
const budgetOptions = ["< Rp15.000", "Rp15.000–30.000", "Rp30.000–50.000", "> Rp50.000"];
const steps = ["Lokasi", "Cuaca", "Kondisi air", "Jenis kolam", "Budget"];
const selectClass = "min-h-14 w-full rounded-2xl border border-[#dde5da] bg-white px-4 text-base font-semibold text-[#344637] outline-none transition focus:border-[#708a6c] focus:ring-4 focus:ring-[#365b3d]/10";

function seasonFor(weather: string): string {
  if (weather === "Hujan") return "Musim Hujan";
  if (weather === "Cerah" || weather === "Panas") return "Musim Panas";
  return "Peralihan";
}

function ChoiceButton({ selected, onClick, children, className = "" }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className={`min-h-[70px] rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31593a] ${selected ? "border-[#507651] bg-[#f0f6ed] text-[#31563a] shadow-[0_0_0_2px_rgba(67,109,68,.08)]" : "border-[#e4e9e2] bg-white text-[#4f5d50] hover:border-[#bacbb8] hover:bg-[#fbfcf9]"} ${className}`}>{children}</button>;
}

export function AIWizard() {
  const [preferences, setPreferences] = useState<UserPreferences>({ ...defaultPreferences });
  const [step, setStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [memberReviews, setMemberReviews] = useState<RecipeReview[]>([]);
  const [publishedRecipes, setPublishedRecipes] = useState<Recipe[]>([]);
  const [shadowedSlugs, setShadowedSlugs] = useState<string[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<RecipeReview[]>([]);

  useEffect(() => {
    const syncReviews = () => setMemberReviews(readCommunityReviews());
    syncReviews();
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
    window.addEventListener(COMMUNITY_REVIEWS_EVENT, syncReviews);
    window.addEventListener("storage", syncReviews);
    return () => {
      controller.abort();
      window.removeEventListener(COMMUNITY_REVIEWS_EVENT, syncReviews);
      window.removeEventListener("storage", syncReviews);
    };
  }, []);

  useEffect(() => {
    const applyFinderPreferences = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("province") || params.get("recommend") === "1") {
        const weather = params.get("weather") ?? defaultPreferences.weather;
        setPreferences({
          province: params.get("province") ?? defaultPreferences.province,
          weather,
          water: params.get("water") ?? defaultPreferences.water,
          fishingType: params.get("type") ?? defaultPreferences.fishingType,
          budget: params.get("budget") ?? defaultPreferences.budget,
          season: seasonFor(weather),
        });
        setShowResult(params.get("recommend") === "1");
      }
    };
    const timer = window.setTimeout(applyFinderPreferences, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const extraReviews = useMemo(() => approvedReviews.filter((remote) => !memberReviews.some((local) => local.name === remote.name && local.comment === remote.comment)), [approvedReviews, memberReviews]);
  const recommendationRecipes = useMemo(() => {
    const hidden = new Set(shadowedSlugs);
    return mergeRecipesBySlug(recipes.filter((recipe) => !hidden.has(recipe.slug)), publishedRecipes);
  }, [publishedRecipes, shadowedSlugs]);
  const expertResults = useMemo(
    () => rankExpertRecipes(preferences, [], [...reviews, ...memberReviews, ...extraReviews], recommendationRecipes),
    [preferences, memberReviews, extraReviews, recommendationRecipes],
  );
  const primary = expertResults[0]?.recipe;
  const alternatives = expertResults.slice(1, 3);

  function update(key: keyof UserPreferences, value: string) {
    setPreferences((current) => ({ ...current, [key]: value, ...(key === "weather" ? { season: seasonFor(value) } : {}) }));
  }

  function continueFlow() {
    if (step < steps.length - 1) setStep((current) => current + 1);
    else {
      setShowResult(true);
      window.setTimeout(() => document.getElementById("ai-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
  }

  function restart() {
    setStep(0);
    setShowResult(false);
    setPreferences({ ...defaultPreferences });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderQuestion() {
    if (step === 0) return <div className="max-w-lg"><label htmlFor="province-select" className="mb-2 block text-sm font-bold text-[#526153]">Pilih provinsi</label><div className="relative"><MapPin size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#819080]" /><select id="province-select" className={`${selectClass} pl-11`} value={preferences.province} onChange={(event) => update("province", event.target.value)}>{provinces.map((province) => <option key={province.slug}>{province.name}</option>)}</select></div><p className="mt-3 text-xs leading-5 text-[#8a9389]">Pilih daerah paling dekat dengan spotmu. Setiap kolam tetap punya karakter air yang berbeda.</p></div>;
    if (step === 1) return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{weatherOptions.map(({ label, emoji, icon: Icon }) => <ChoiceButton key={label} selected={preferences.weather === label} onClick={() => update("weather", label)} className="min-h-[118px]"><Icon size={20} className="text-[#637c65]" /><span className="mt-3 block text-sm font-extrabold">{emoji} {label}</span><span className="mt-1 block text-xs text-[#899187]">Cuaca sekarang</span></ChoiceButton>)}</div>;
    if (step === 2) return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{waterOptions.map(({ label, emoji, note }) => <ChoiceButton key={label} selected={preferences.water === label} onClick={() => update("water", label)} className="min-h-[118px]"><span className="text-2xl" aria-hidden="true">{emoji}</span><span className="mt-3 block text-sm font-extrabold">{label}</span><span className="mt-1 block text-xs text-[#899187]">{note}</span></ChoiceButton>)}</div>;
    if (step === 3) return <div className="grid gap-3 sm:grid-cols-3">{typeOptions.map(({ label, emoji, note }) => <ChoiceButton key={label} selected={preferences.fishingType === label} onClick={() => update("fishingType", label)} className="min-h-[112px]"><span className="text-2xl" aria-hidden="true">{emoji}</span><span className="mt-2 block text-sm font-extrabold">{label}</span><span className="mt-1 block text-xs text-[#899187]">{note}</span></ChoiceButton>)}</div>;
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{budgetOptions.map((budget) => <ChoiceButton key={budget} selected={preferences.budget === budget} onClick={() => update("budget", budget)} className="min-h-[95px]"><span className="text-xl" aria-hidden="true">💰</span><span className="mt-2 block text-sm font-extrabold">{budget}</span></ChoiceButton>)}</div>;
  }

  const questionTitle = ["Di mana kamu akan memancing?", "Bagaimana kondisi cuaca?", "Bagaimana kondisi air?", "Jenis pemancingan apa?", "Berapa budget umpanmu?"];
  const questionDescription = ["Ceritakan lokasi secara umum agar rekomendasi lebih dekat dengan racikan sekitar.", "Pilih keadaan cuaca yang paling menggambarkan sesi mancingmu.", "Air kolam bisa berubah karena hujan, aliran, dan aktivitas pemancing.", "Pilih gaya mancing yang akan kamu jalani.", "Kami utamakan racikan yang masih masuk rentang budgetmu."];

  return (
    <div>
      <div className="mb-8 max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full bg-[#eaf1e7] px-3 py-1.5 text-xs font-bold text-[#49664a]"><Sparkles size={14} /> Rekomendasi berbasis kecocokan</span><h1 className="mt-4 text-4xl font-black tracking-[-.045em] text-[#203326] sm:text-5xl">🤖 AI Umpan</h1><p className="mt-3 text-base leading-7 text-[#728072]">Ceritakan kondisi mancingmu. Kami bantu mencari racikan yang paling sesuai.</p><div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#e3e9e0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-extrabold text-[#344638]">Punya bahan tertentu di rumah?</p><p className="mt-1 text-xs leading-5 text-[#7e887d]">Racik kombinasi bahan, lihat takaran contoh, dan pahami alasan pakar.</p></div><Link href="/sistem-pakar" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#edf3e9] px-4 text-xs font-bold text-[#385b3b] transition hover:bg-[#e3eddf]">Coba Sistem Pakar <ArrowRight size={14} /></Link></div></div>
      <section className="overflow-hidden rounded-[28px] border border-[#e5eae2] bg-white shadow-[0_12px_40px_rgba(38,55,40,.06)]">
        <div className="border-b border-[#edf0eb] bg-[#f8faf6] px-5 py-5 sm:px-8">
          <div className="mb-3 flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#738171]">Langkah {String(step + 1).padStart(2, "0")} <span className="font-medium tracking-normal">dari 05</span></p><p className="text-xs font-semibold text-[#8a9388]">{steps[step]}</p></div>
          <div className="flex gap-1.5" aria-label={`Langkah ${step + 1} dari 5`}>{steps.map((item, index) => <div key={item} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-[#456b48]" : "bg-[#e2e8df]"}`} />)}</div>
        </div>
        <div className="p-5 sm:p-8 lg:p-10">
          <div className="flex items-start gap-3 sm:gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eaf0e7] text-xl">🎣</span><div><h2 className="text-xl font-extrabold tracking-tight text-[#2c3d30] sm:text-2xl">{questionTitle[step]}</h2><p className="mt-1.5 text-sm leading-6 text-[#7a8579]">{questionDescription[step]}</p></div></div>
          <div className="mt-7">{renderQuestion()}</div>
          <div className="mt-8 flex items-center justify-between border-t border-[#edf0eb] pt-5"><button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-[#657365] transition hover:bg-[#f4f6f2] disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={16} /> Kembali</button><button type="button" onClick={continueFlow} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#294b34] px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#203d29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294b34]">{step === steps.length - 1 ? "🎯 Cari Umpan" : "Lanjut"}<ArrowRight size={16} /></button></div>
        </div>
      </section>

      {showResult && primary && <section id="ai-results" className="scroll-mt-24 pt-12"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[#778676]">Hasil racikan untukmu</p><h2 className="text-3xl font-black tracking-tight text-[#203326]">🎯 Rekomendasi untuk Anda</h2><p className="mt-2 text-sm text-[#788278]">Disesuaikan untuk {preferences.province ?? defaultPreferences.province}, cuaca {(preferences.weather ?? defaultPreferences.weather).toLowerCase()}, air {(preferences.water ?? defaultPreferences.water).toLowerCase()}.</p></div><button type="button" onClick={restart} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#59705a] hover:bg-[#eef3eb]"><RotateCcw size={15} /> Ubah kondisi</button></div>
        <div className="space-y-5"><RecommendationCard recipe={primary} score={expertResults[0].score} isPrimary /><div className="rounded-2xl border border-[#e5eae2] bg-white p-4 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-[#334436]">Bahan utama racikan</p><p className="mt-1 text-xs text-[#8a9388]">Lihat takaran lengkap dan langkah persiapan di halaman resep.</p></div><FavoriteButton recipeSlug={primary.slug} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-[#e1e7df] px-3 text-xs font-bold text-[#526452] hover:bg-[#f5f8f2]" /></div><div className="flex flex-wrap gap-2">{primary.ingredients.slice(0, 5).map((ingredient) => <Badge key={ingredient.name} tone="cream">{ingredient.name} · {ingredient.amount}</Badge>)}</div></div></div>
        <div className="mt-10"><SectionHeader eyebrow="Pilihan lain yang cocok" title="Alternatif racikan" subtitle="Coba opsi lain jika bahan utama belum tersedia." /><div className="grid gap-5 lg:grid-cols-2">{alternatives.map((item) => <RecommendationCard key={item.recipe.slug} recipe={item.recipe} score={item.score} />)}</div></div>
        <div className="mt-6 flex items-start gap-2 rounded-xl bg-[#f2f5ef] p-4 text-xs leading-5 text-[#748073]"><Check size={15} className="mt-0.5 shrink-0 text-[#648064]" />Skor dihitung dari kecocokan kondisi dan data komunitas, bukan hasil yang dijamin. Respons ikan dapat berbeda di tiap kolam dan waktu.</div>
      </section>}
    </div>
  );
}
