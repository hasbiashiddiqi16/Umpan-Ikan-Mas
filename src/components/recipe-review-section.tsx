"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, MessageSquareText, Send, Star } from "lucide-react";
import type { Recipe } from "@/data/recipes";
import type { RecipeReview } from "@/data/reviews";
import { provinces } from "@/data/provinces";
import { COMMUNITY_REVIEWS_EVENT, readCommunityReviews, saveCommunityReview, type MemberReview } from "@/lib/community-storage";
import { Rating, SectionHeader } from "@/components/shared";
import { ReviewCard } from "@/components/recipe-details";

const inputClass = "min-h-11 w-full rounded-xl border border-[#e4e9e2] bg-white px-3.5 text-sm text-[#334436] outline-none transition placeholder:text-[#a0a79e] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";

function StarRatingInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Pilih rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hover || value);
        return <button key={star} type="button" onClick={() => onChange(star)} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)} aria-label={`${star} dari 5 bintang`} aria-pressed={value === star} className="grid h-10 w-10 place-items-center rounded-lg transition hover:bg-[#fbf4e5] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#b68a38]"><Star size={24} fill={active ? "currentColor" : "none"} className={active ? "text-[#d5a344]" : "text-[#c5cbc2]"} /></button>;
      })}
      <span className="ml-2 text-sm font-bold text-[#526153]">{value ? `${value}/5` : "Pilih bintang"}</span>
    </div>
  );
}

function RecipeReviewForm({ recipe, onSubmitted }: { recipe: Recipe; onSubmitted: (review: MemberReview) => void }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("Jawa Barat");
  const [rating, setRating] = useState(0);
  const [weather, setWeather] = useState("Hujan");
  const [water, setWater] = useState("Keruh");
  const [fishingType, setFishingType] = useState("Harian");
  const [catchCount, setCatchCount] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [serverSaved, setServerSaved] = useState<boolean | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    setServerSaved(null);
    if (rating < 1) { setError("Pilih rating bintang sebelum mengirim ulasan."); return; }
    if (name.trim().length < 2) { setError("Masukkan nama minimal 2 karakter."); return; }
    if (comment.trim().length < 12) { setError("Ceritakan pengalaman minimal 12 karakter agar bermanfaat untuk pemancing lain."); return; }
    const now = new Date();
    const newReview = {
      name: name.trim().slice(0, 60),
      location: `${city.trim() ? `${city.trim()}, ` : ""}${province}`,
      recipeSlug: recipe.slug,
      rating,
      weather,
      water,
      fishingType,
      catchCount: catchCount ? Math.min(999, Math.max(0, Number(catchCount))) : undefined,
      date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(now),
      comment: comment.trim().slice(0, 500),
    } satisfies Omit<MemberReview, "id" | "createdAt">;
    try {
      const savedReview = saveCommunityReview(newReview);
      onSubmitted(savedReview);
      setComment("");
      setRating(0);
      setSaved(true);
      void fetch("/api/public/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newReview) })
        .then((response) => setServerSaved(response.ok))
        .catch(() => setServerSaved(false));
    } catch {
      setError("Ulasan belum tersimpan. Periksa ruang penyimpanan browser, lalu coba lagi.");
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[22px] border border-[#e5eae2] bg-white p-4 shadow-[0_8px_24px_rgba(38,55,40,.035)] sm:p-6">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef3ea] text-[#587455]"><MessageSquareText size={19} /></span><div><h3 className="text-base font-extrabold text-[#304133]">Pernah mencoba {recipe.name}?</h3><p className="mt-1 text-xs leading-5 text-[#818b80]">Ulasan membantu pemancing lain dan menjadi sinyal untuk sistem pakar.</p></div></div>
      <div className="mt-5 rounded-xl bg-[#faf8f1] p-3.5"><p className="mb-1 text-xs font-bold text-[#716246]">Beri rating</p><StarRatingInput value={rating} onChange={setRating} /></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-bold text-[#657164]">Nama pemancing<input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={60} placeholder="Contoh: Budi" required /></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164]">Kota (opsional)<input className={inputClass} value={city} onChange={(event) => setCity(event.target.value)} maxLength={60} placeholder="Contoh: Bogor" /></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164]">Provinsi<select className={inputClass} value={province} onChange={(event) => setProvince(event.target.value)}>{provinces.map((item) => <option key={item.slug}>{item.name}</option>)}</select></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164]">Cuaca saat mencoba<select className={inputClass} value={weather} onChange={(event) => setWeather(event.target.value)}>{["Hujan", "Mendung", "Cerah", "Berawan", "Panas"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164]">Kondisi air<select className={inputClass} value={water} onChange={(event) => setWater(event.target.value)}>{["Keruh", "Hijau", "Jernih", "Kekuningan"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164]">Jenis pemancingan<select className={inputClass} value={fishingType} onChange={(event) => setFishingType(event.target.value)}>{["Harian", "Lomba", "Galat"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164] sm:col-span-2">Hasil tangkapan (opsional)<div className="relative"><input className={`${inputClass} pr-16`} type="number" inputMode="numeric" min="0" max="999" value={catchCount} onChange={(event) => setCatchCount(event.target.value)} placeholder="0" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#9aa198]">ekor</span></div></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164] sm:col-span-2">Ceritakan pengalaman<textarea className="min-h-28 w-full resize-y rounded-xl border border-[#e4e9e2] bg-white px-3.5 py-3 text-sm leading-6 text-[#334436] outline-none transition placeholder:text-[#a0a79e] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10" value={comment} onChange={(event) => setComment(event.target.value)} minLength={12} maxLength={500} placeholder="Kondisi kolam, cara meracik, dan bagaimana hasilnya?" required /><span className="text-right text-[10px] font-medium text-[#9aa198]">{comment.length}/500</span></label>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] leading-5 text-[#929a90]">Tanpa akun. Tersimpan lokal di perangkat ini dan dapat memengaruhi rekomendasi di browser yang sama.</p><button type="submit" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white transition hover:bg-[#203d29]"><Send size={15} /> Kirim ulasan</button></div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-[#fbefeb] px-3 py-2 text-xs font-semibold text-[#9b513f]">{error}</p>}
      {saved && <p role="status" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#eef5eb] px-3 py-2 text-xs font-semibold text-[#426641]"><CheckCircle2 size={15} />{serverSaved === true ? "Ulasan tersimpan dan menunggu persetujuan editor. Terima kasih sudah berbagi!" : serverSaved === false ? "Ulasan tersimpan di perangkat ini. Pengiriman untuk moderasi akan dicoba lagi saat tersedia." : "Ulasan tersimpan di perangkat ini; sedang mengirim untuk moderasi…"}</p>}
    </form>
  );
}

export function LiveRecipeRating({ recipe }: { recipe: Recipe }) {
  const [memberReviews, setMemberReviews] = useState<MemberReview[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<RecipeReview[]>([]);
  useEffect(() => {
    const sync = () => setMemberReviews(readCommunityReviews().filter((review) => review.recipeSlug === recipe.slug));
    sync();
    const controller = new AbortController();
    void fetch(`/api/public/reviews?slug=${encodeURIComponent(recipe.slug)}`, { signal: controller.signal, cache: "no-store" })
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
  }, [recipe.slug]);
  const remote = approvedReviews.filter((review) => !memberReviews.some((local) => local.name === review.name && local.comment === review.comment));
  const count = recipe.reviewCount + memberReviews.length + remote.length;
  const average = count ? (recipe.rating * recipe.reviewCount + memberReviews.reduce((sum, review) => sum + review.rating, 0) + remote.reduce((sum, review) => sum + review.rating, 0)) / count : recipe.rating;
  return <span className="inline-flex items-center gap-x-4 gap-y-2"><Rating value={Math.round(average * 10) / 10} count={count} /><span className="text-xs text-[#879087]">{new Intl.NumberFormat("id-ID").format(recipe.users)} pemancing mencoba</span></span>;
}

export function RecipeReviewSection({ recipe, seedReviews }: { recipe: Recipe; seedReviews: RecipeReview[] }) {
  const [memberReviews, setMemberReviews] = useState<MemberReview[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<RecipeReview[]>([]);
  useEffect(() => {
    const sync = () => setMemberReviews(readCommunityReviews().filter((review) => review.recipeSlug === recipe.slug));
    sync();
    const controller = new AbortController();
    void fetch(`/api/public/reviews?slug=${encodeURIComponent(recipe.slug)}`, { signal: controller.signal, cache: "no-store" })
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
  }, [recipe.slug]);

  const visibleReviews = useMemo(() => {
    const remote = approvedReviews.filter((review) => !memberReviews.some((local) => local.name === review.name && local.comment === review.comment));
    return [...memberReviews, ...remote, ...seedReviews];
  }, [approvedReviews, memberReviews, seedReviews]);
  const aggregate = useMemo(() => {
    const remote = approvedReviews.filter((review) => !memberReviews.some((local) => local.name === review.name && local.comment === review.comment));
    const denominator = recipe.reviewCount + memberReviews.length + remote.length;
    const score = denominator ? (recipe.rating * recipe.reviewCount + memberReviews.reduce((sum, review) => sum + review.rating, 0) + remote.reduce((sum, review) => sum + review.rating, 0)) / denominator : recipe.rating;
    return { score: Math.round(score * 10) / 10, count: denominator };
  }, [approvedReviews, memberReviews, recipe.rating, recipe.reviewCount]);

  return (
    <section id="ulasan" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4"><SectionHeader eyebrow="Cerita dari komunitas" title="Ulasan pemancing" subtitle="Rating dan pengalaman menjadi masukan untuk rekomendasi. Hasil setiap kolam bisa berbeda." /><div className="mb-7 rounded-2xl border border-[#e8ebe4] bg-white px-4 py-3"><div className="flex items-center gap-2"><span className="text-3xl font-black tracking-tight text-[#2d402f]">{aggregate.score.toFixed(1)}</span><div><Rating value={aggregate.score} compact /><p className="mt-1 text-[10px] text-[#929a90]">{new Intl.NumberFormat("id-ID").format(aggregate.count)} rating</p></div></div></div></div>
      <RecipeReviewForm recipe={recipe} onSubmitted={(review) => setMemberReviews((current) => [review, ...current.filter((item) => item.id !== review.id)])} />
      <div className="flex items-center justify-between pt-4"><h3 className="text-sm font-extrabold text-[#394a3b]">Pengalaman terbaru</h3><span className="text-xs text-[#8a9389]">{visibleReviews.length} cerita ditampilkan</span></div>
      {visibleReviews.length ? <div className="grid gap-3 sm:grid-cols-2">{visibleReviews.map((review, index) => <ReviewCard key={`${review.name}-${review.date}-${index}`} review={review} />)}</div> : <div className="rounded-2xl border border-dashed border-[#dce4d9] bg-white p-6 text-sm text-[#7b857a]">Belum ada ulasan rinci untuk racikan ini. Jadilah pemancing pertama yang berbagi pengalaman.</div>}
    </section>
  );
}
