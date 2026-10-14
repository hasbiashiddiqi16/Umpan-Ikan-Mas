"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, MessageSquareText, Send, Star } from "lucide-react";
import type { Recipe } from "@/data/recipes";
import type { RecipeReview } from "@/data/reviews";
import { provinces } from "@/data/provinces";
import { COMMUNITY_REVIEWS_EVENT, markCommunityReviewSync, readCommunityReviews, readUnsyncedReviews, removeCommunityReviews, saveCommunityReview, type MemberReview } from "@/lib/community-storage";
import { UseMyLocationButton } from "@/components/location-controls";
import { Badge, Rating, RecipeRating, SectionHeader } from "@/components/shared";
import { SELECT_FIELD_CLASS, SelectBox } from "@/components/form-fields";
import { ReviewCard } from "@/components/recipe-details";
import { useLocationAutofill } from "@/lib/use-location";

const inputClass = "min-h-11 min-w-0 w-full rounded-xl border border-[#e4e9e2] bg-white px-3.5 text-sm text-[#334436] outline-none transition placeholder:text-[#a0a79e] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";
/** Dropdown di form ini memakai panah buatan sendiri (lihat `SelectBox`). */
const selectClass = `${SELECT_FIELD_CLASS} min-h-12 min-w-0 w-full rounded-xl border border-[#e4e9e2] bg-white pl-3.5 text-sm text-[#334436] outline-none transition focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10 sm:min-h-11`;

function StarRatingInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Pilih rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hover || value);
        return <button key={star} type="button" onClick={() => onChange(star)} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)} aria-label={`${star} dari 5 bintang`} aria-pressed={value === star} className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-[#fbf4e5] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#b68a38] min-[360px]:h-9 min-[360px]:w-9 sm:h-10 sm:w-10"><Star size={24} fill={active ? "currentColor" : "none"} className={active ? "text-[#d5a344]" : "text-[#c5cbc2]"} /></button>;
      })}
      <span className="basis-full text-sm font-bold text-[#526153] sm:ml-2 sm:basis-auto">{value ? `${value}/5` : "Pilih bintang"}</span>
    </div>
  );
}

function RecipeReviewForm({ recipe, onSubmitted }: { recipe: Recipe; onSubmitted: (review: MemberReview) => void }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  // Provinsi dibiarkan kosong sampai lokasi diizinkan atau dipilih manual.
  const [province, setProvince] = useState("");
  const [rating, setRating] = useState(0);
  const [weather, setWeather] = useState("Hujan");
  const [water, setWater] = useState("Keruh");
  const [fishingType, setFishingType] = useState("Harian");
  const [catchCount, setCatchCount] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [serverSaved, setServerSaved] = useState<boolean | null>(null);
  const { markTouched: markLocationTouched } = useLocationAutofill((place) => {
    setProvince(place.province);
    if (place.city) setCity(place.city);
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    setServerSaved(null);
    if (rating < 1) { setError("Pilih rating bintang sebelum mengirim ulasan."); return; }
    if (name.trim().length < 2) { setError("Masukkan nama minimal 2 karakter."); return; }
    if (!province) { setError("Pilih provinsi dulu, atau tekan “Gunakan lokasi saya” agar terisi otomatis."); return; }
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
        .then(async (response) => {
          const data = response.ok ? await response.json() as { id?: number } : {};
          markCommunityReviewSync(savedReview.id, response.ok, data.id);
          setServerSaved(response.ok);
        })
        .catch(() => { markCommunityReviewSync(savedReview.id, false); setServerSaved(false); });
    } catch {
      setError("Ulasan belum tersimpan. Periksa ruang penyimpanan browser, lalu coba lagi.");
    }
  }

  return (
    <form onSubmit={submit} className="min-w-0 rounded-[22px] border border-[#e5eae2] bg-white p-4 shadow-[0_8px_24px_rgba(38,55,40,.035)] sm:p-6">
      <div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef3ea] text-[#587455]"><MessageSquareText size={19} /></span><div className="min-w-0"><h3 className="break-words text-base font-extrabold text-[#304133]">Pernah mencoba {recipe.name}?</h3><p className="mt-1 break-words text-xs leading-5 text-[#818b80]">Ulasan membantu pemancing lain dan menjadi sinyal untuk sistem pakar.</p></div></div>
      <div className="mt-5 rounded-xl bg-[#faf8f1] p-3.5"><p className="mb-1 text-xs font-bold text-[#716246]">Beri rating</p><StarRatingInput value={rating} onChange={setRating} /></div>
      <div className="mt-4 flex flex-col gap-2.5 rounded-xl border border-[#e9ede7] bg-[#f8faf6] p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[#77827a]">Kota dan provinsi bisa terisi otomatis dari lokasi perangkatmu. Lokasi tidak dikirim ke server.</p>
        <UseMyLocationButton onPlace={(place) => { setProvince(place.province); if (place.city) setCity(place.city); }} label="Gunakan lokasi saya" className="shrink-0" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-bold text-[#657164]">Nama pemancing<input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={60} placeholder="Contoh: Budi" required /></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164]">Kota (opsional)<input className={inputClass} value={city} onChange={(event) => { markLocationTouched(); setCity(event.target.value); }} maxLength={60} placeholder="Contoh: Bogor" /></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164]">Provinsi<SelectBox><select className={selectClass} value={province} onChange={(event) => { markLocationTouched(); setProvince(event.target.value); }}><option value="">Pilih provinsi</option>{provinces.map((item) => <option key={item.slug}>{item.name}</option>)}</select></SelectBox></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164]">Cuaca saat mencoba<SelectBox><select className={selectClass} value={weather} onChange={(event) => setWeather(event.target.value)}>{["Hujan", "Mendung", "Cerah", "Berawan", "Panas"].map((item) => <option key={item}>{item}</option>)}</select></SelectBox></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164]">Kondisi air<SelectBox><select className={selectClass} value={water} onChange={(event) => setWater(event.target.value)}>{["Keruh", "Hijau", "Jernih", "Kekuningan"].map((item) => <option key={item}>{item}</option>)}</select></SelectBox></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164]">Jenis pemancingan<SelectBox><select className={selectClass} value={fishingType} onChange={(event) => setFishingType(event.target.value)}>{["Harian", "Lomba", "Galatama"].map((item) => <option key={item}>{item}</option>)}</select></SelectBox></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164] sm:col-span-2">Hasil tangkapan (opsional)<div className="relative"><input className={`${inputClass} pr-16`} type="number" inputMode="numeric" min="0" max="999" value={catchCount} onChange={(event) => setCatchCount(event.target.value)} placeholder="0" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#9aa198]">ekor</span></div></label>
        <label className="grid gap-1.5 text-xs font-bold text-[#657164] sm:col-span-2">Ceritakan pengalaman<textarea className="min-h-28 min-w-0 w-full resize-y rounded-xl border border-[#e4e9e2] bg-white px-3.5 py-3 text-sm leading-6 text-[#334436] outline-none transition placeholder:text-[#a0a79e] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10" value={comment} onChange={(event) => setComment(event.target.value)} minLength={12} maxLength={500} placeholder="Kondisi kolam, cara meracik, dan bagaimana hasilnya?" required /><span className="text-right text-[10px] font-medium text-[#9aa198]">{comment.length}/500</span></label>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] leading-5 text-[#929a90]">Tanpa akun. Tersimpan lokal di perangkat ini dan dapat memengaruhi rekomendasi di browser yang sama.</p><button type="submit" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white transition hover:bg-[#203d29]"><Send size={15} /> Kirim ulasan</button></div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-[#fbefeb] px-3 py-2 text-xs font-semibold text-[#9b513f]">{error}</p>}
      {saved && <p role="status" className="mt-3 flex max-w-full items-start gap-2 rounded-lg bg-[#eef5eb] px-3 py-2 text-xs font-semibold leading-5 text-[#426641]"><CheckCircle2 size={15} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{serverSaved === true ? "Ulasan tersimpan dan menunggu persetujuan editor. Terima kasih sudah berbagi!" : serverSaved === false ? "Ulasan tersimpan di perangkat ini. Kami akan mencoba mengirimnya lagi saat Anda membuka halaman resep berikutnya." : "Ulasan tersimpan di perangkat ini; sedang mengirim untuk moderasi…"}</span></p>}
    </form>
  );
}

/**
 * Mengirim ulang ulasan yang dulu gagal tersimpan di server. Dijalankan saat
 * halaman resep dibuka, jadi ulasan tidak hilang hanya karena server mati.
 */
function useReviewOutboxRetry() {
  useEffect(() => {
    const pending = readUnsyncedReviews();
    if (!pending.length) return;
    const controller = new AbortController();
    void Promise.all(pending.map(async (review) => {
      try {
        const response = await fetch("/api/public/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            recipeSlug: review.recipeSlug, name: review.name, location: review.location, rating: review.rating,
            weather: review.weather, water: review.water, fishingType: review.fishingType,
            catchCount: review.catchCount, comment: review.comment,
          }),
        });
        if (response.ok) {
          const data = await response.json() as { id?: number };
          markCommunityReviewSync(review.id, true, data.id);
        }
      } catch {
        // Server masih belum tersedia: biarkan menunggu kesempatan berikutnya.
      }
    }));
    return () => { controller.abort(); };
  }, []);
}

/**
 * Menyelaraskan salinan lokal dengan hasil moderasi di server.
 *
 * Ulasan tersimpan dua kali: di peramban pengirim (agar langsung tampil) dan di
 * server (untuk moderasi). Tanpa penyelarasan ini, ulasan yang ditolak admin
 * akan terus tampil di peramban pengirimnya. Hasil yang ditangani:
 *
 * - `approved`  → salinan lokal dihapus; versi server yang tampil (tanpa ganda)
 * - `rejected`  → salinan lokal dihapus, sesuai keputusan admin
 * - `missing`   → dihapus hanya bila ID servernya dikenal (barisnya sudah tidak ada)
 * - `pending`   → dibiarkan, supaya pengirim tetap melihat kirimannya
 *
 * Kalau server tidak dapat dihubungi, semuanya dibiarkan apa adanya.
 */
async function fetchModerationStatus(reviews: MemberReview[], signal?: AbortSignal): Promise<string[] | null> {
  if (!reviews.length) return null;
  try {
    const response = await fetch("/api/public/reviews/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ items: reviews.map((review) => ({ id: review.serverId, name: review.name, comment: review.comment })) }),
    });
    if (!response.ok) return null;
    const body = await response.json() as { results?: { status?: string }[] };
    if (!Array.isArray(body.results) || body.results.length !== reviews.length) return null;
    return body.results.map((result) => result?.status ?? "missing");
  } catch {
    return null;
  }
}

/** Memuat ulasan komunitas sebuah resep: salinan lokal + hasil moderasi server. */
function useCommunityReviews(slug: string) {
  const [memberReviews, setMemberReviews] = useState<MemberReview[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<RecipeReview[]>([]);

  /** Membaca ulang salinan lokal; dipakai setelah kiriman baru tersimpan. */
  const refresh = useCallback(() => {
    setMemberReviews(readCommunityReviews().filter((review) => review.recipeSlug === slug));
  }, [slug]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const sync = () => {
      if (active) setMemberReviews(readCommunityReviews().filter((review) => review.recipeSlug === slug));
    };
    sync();

    void (async () => {
      const lokal = readCommunityReviews().filter((review) => review.recipeSlug === slug);
      const [statuses, approved] = await Promise.all([
        fetchModerationStatus(lokal, controller.signal),
        fetch(`/api/public/reviews?slug=${encodeURIComponent(slug)}`, { signal: controller.signal, cache: "no-store" })
          .then(async (response) => response.ok ? await response.json() as { reviews?: RecipeReview[] } : { reviews: [] })
          .then((body) => body.reviews ?? [])
          .catch(() => [] as RecipeReview[]),
      ]);
      if (!active) return;
      setApprovedReviews(approved);
      if (!statuses) return;
      const hapus = lokal.filter((review, index) => {
        const status = statuses[index];
        if (status === "approved" || status === "rejected") return true;
        return status === "missing" && review.serverId !== undefined;
      });
      if (hapus.length) removeCommunityReviews(hapus.map((review) => review.id));
    })();

    window.addEventListener(COMMUNITY_REVIEWS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      active = false;
      controller.abort();
      window.removeEventListener(COMMUNITY_REVIEWS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [slug]);

  return { memberReviews, approvedReviews, refresh };
}

/**
 * Ringkasan rating dari ulasan asli saja (kiriman pengunjung + hasil moderasi).
 * Ulasan contoh tidak pernah ikut dihitung.
 */
function summarizeReviews(memberReviews: MemberReview[], remoteReviews: RecipeReview[]) {
  const count = memberReviews.length + remoteReviews.length;
  const total = memberReviews.reduce((sum, review) => sum + review.rating, 0) + remoteReviews.reduce((sum, review) => sum + review.rating, 0);
  return { count, average: count ? Math.round((total / count) * 10) / 10 : 0 };
}

export function LiveRecipeRating({ recipe }: { recipe: Recipe }) {
  useReviewOutboxRetry();
  const { memberReviews, approvedReviews } = useCommunityReviews(recipe.slug);
  const remote = approvedReviews.filter((review) => !memberReviews.some((local) => local.name === review.name && local.comment === review.comment));
  const aggregate = summarizeReviews(memberReviews, remote);
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-x-4 gap-y-2">
      {aggregate.count ? <Rating value={aggregate.average} count={aggregate.count} /> : <RecipeRating />}
      <span className="text-xs text-[#879087]">
        {aggregate.count ? `${new Intl.NumberFormat("id-ID").format(aggregate.count)} ulasan pengunjung` : "Belum ada ulasan"}
      </span>
    </span>
  );
}

export function RecipeReviewSection({ recipe, sampleReviews = [] }: { recipe: Recipe; sampleReviews?: RecipeReview[] }) {
  const { memberReviews, approvedReviews, refresh } = useCommunityReviews(recipe.slug);

  // Ulasan asli (kiriman pengunjung + hasil moderasi) dan ulasan contoh dipisah:
  // contoh tidak pernah bercampur dengan kiriman pengunjung dan tidak dihitung.
  const remoteReviews = useMemo(
    () => approvedReviews.filter((review) => !memberReviews.some((local) => local.name === review.name && local.comment === review.comment)),
    [approvedReviews, memberReviews],
  );
  const visitorReviews = useMemo(() => [...memberReviews, ...remoteReviews], [memberReviews, remoteReviews]);
  const aggregate = useMemo(() => summarizeReviews(memberReviews, remoteReviews), [memberReviews, remoteReviews]);
  const examples = useMemo(() => sampleReviews.filter((review) => review.sample !== false), [sampleReviews]);

  return (
    <section id="ulasan" className="scroll-mt-24 space-y-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader eyebrow="Cerita dari komunitas" title="Ulasan pemancing" subtitle="Hanya ulasan pengunjung yang dihitung. Rating baru muncul setelah ada ulasan yang disetujui editor." />
        <div className="mb-7 w-fit max-w-full shrink-0 rounded-2xl border border-[#e8ebe4] bg-white px-4 py-3">
          {aggregate.count ? (
            <div className="flex items-center gap-2"><span className="text-3xl font-black tracking-tight text-[#2d402f]">{aggregate.average.toFixed(1)}</span><div><Rating value={aggregate.average} compact /><p className="mt-1 text-[10px] text-[#929a90]">{new Intl.NumberFormat("id-ID").format(aggregate.count)} ulasan</p></div></div>
          ) : (
            <div className="flex items-center gap-2"><span className="text-3xl font-black tracking-tight text-[#c6cdc3]">–</span><div><RecipeRating /><p className="mt-1 text-[10px] text-[#929a90]">Belum ada ulasan</p></div></div>
          )}
        </div>
      </div>
      <RecipeReviewForm recipe={recipe} onSubmitted={() => refresh()} />
      <div className="flex flex-wrap items-center justify-between gap-2 pt-4"><h3 className="text-sm font-extrabold text-[#394a3b]">Pengalaman pengunjung</h3><span className="text-xs text-[#8a9389]">{new Intl.NumberFormat("id-ID").format(aggregate.count)} ulasan</span></div>
      {visitorReviews.length ? <div className="grid gap-3 sm:grid-cols-2">{visitorReviews.map((review, index) => <ReviewCard key={`${review.name}-${review.date}-${index}`} review={review} />)}</div> : <div className="rounded-2xl border border-dashed border-[#dce4d9] bg-white p-6 text-sm text-[#7b857a]">Belum ada ulasan dari pengunjung untuk racikan ini. Jadilah pemancing pertama yang berbagi pengalaman.</div>}
      {examples.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[#ede4cc] bg-[#faf7ee] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2"><Badge tone="cream">Data contoh</Badge><h3 className="text-sm font-extrabold text-[#6b6146]">Contoh penulisan ulasan</h3></div>
          <p className="mt-2 text-xs leading-5 text-[#7b725d]">{examples.length} contoh di bawah dibuat tim redaksi sebagai gambaran format ulasan. Ini bukan kiriman pengunjung dan tidak dihitung dalam rating maupun jumlah ulasan.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{examples.map((review, index) => <ReviewCard key={`contoh-${review.seedKey ?? index}`} review={review} />)}</div>
        </div>
      )}
    </section>
  );
}
