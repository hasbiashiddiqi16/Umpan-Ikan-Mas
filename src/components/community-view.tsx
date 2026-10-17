"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Trophy, Waves } from "lucide-react";
import { fishingReports } from "@/data/fishingReports";
import { reviews } from "@/data/reviews";
import { COMMUNITY_REVIEWS_EVENT, readCommunityReviews } from "@/lib/community-storage";
import { CommunityCard } from "@/components/cards";
import { Badge } from "@/components/shared";
import { ReviewCard } from "@/components/recipe-details";

const tabs = ["Semua", "Hasil Mancing", "Racikan", "Review"];
const reviewsPerPage = 24;

export function CommunityView({ embedded = false }: { embedded?: boolean }) {
  const [activeTab, setActiveTab] = useState("Semua");
  const [memberReviews, setMemberReviews] = useState<ReturnType<typeof readCommunityReviews>>([]);
  const [approvedReviews, setApprovedReviews] = useState<typeof reviews>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [reviewLimit, setReviewLimit] = useState(reviewsPerPage);
  useEffect(() => {
    const sync = () => setMemberReviews(readCommunityReviews());
    sync();
    const controller = new AbortController();
    void fetch("/api/public/reviews", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ reviews?: typeof reviews }> : { reviews: [] })
      .then((body) => setApprovedReviews(body.reviews ?? []))
      .catch(() => undefined)
      .finally(() => setReviewsLoaded(true));
    window.addEventListener(COMMUNITY_REVIEWS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      controller.abort();
      window.removeEventListener(COMMUNITY_REVIEWS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const serverOnlyReviews = useMemo(() => approvedReviews.filter((remote) => !memberReviews.some((local) => local.name === remote.name && local.comment === remote.comment)), [approvedReviews, memberReviews]);
  // Angka dan daftar ulasan hanya dari kiriman pengunjung; contoh dipisah dan diberi label.
  const allReviews = useMemo(() => [...memberReviews, ...serverOnlyReviews], [memberReviews, serverOnlyReviews]);
  const visibleReviews = useMemo(() => allReviews.slice(0, reviewLimit), [allReviews, reviewLimit]);
  const sampleReviews = useMemo(() => reviews.filter((review) => review.sample), []);
  const sampleShowcase = useMemo(() => sampleReviews.slice(0, 3), [sampleReviews]);
  const reportResults = useMemo(() => {
    if (activeTab === "Hasil Mancing") return fishingReports.filter((report) => report.catchCount > 0);
    if (activeTab === "Racikan") return fishingReports.filter((report) => Boolean(report.recipeSlug));
    return fishingReports;
  }, [activeTab]);

  return (
    <div>
      {!embedded && <div className="relative isolate mb-8 overflow-hidden rounded-[28px] bg-[#203e2c] px-6 py-9 text-white sm:px-10 sm:py-12"><div className="absolute -right-12 -top-16 -z-10 h-56 w-56 rounded-full border-[34px] border-white/[.05]" /><span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#dfd0a5]"><MessageCircle size={15} /> Cerita dari pinggir kolam</span><h1 className="mt-4 text-4xl font-black tracking-[-.045em] sm:text-5xl">Komunitas Pemancing</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">Berbagi kondisi, racikan, dan cerita hasil mancing. Setiap pengalaman berbeda—semoga jadi inspirasi untuk sesi berikutnya.</p><div className="mt-6 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs"><Trophy size={14} /> Hasil mancing</span><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs"><Waves size={14} /> Berbagai kondisi kolam</span></div></div>}
      <div className="mb-6 flex gap-2 overflow-x-auto" role="tablist" aria-label="Filter cerita komunitas">{tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => { setActiveTab(tab); setReviewLimit(reviewsPerPage); }} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold transition ${activeTab === tab ? "bg-[#294b34] text-white" : "bg-white text-[#616d62] (4.65:1 terburuk) hover:bg-[#eef3eb]"}`}>{tab}</button>)}</div>
      {activeTab === "Review" ? <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-extrabold text-[#394a3b]">Ulasan komunitas</p><p className="text-xs text-[#666d66] (4.57:1 terburuk)">{allReviews.length ? `Menampilkan ${visibleReviews.length} dari ${allReviews.length} ulasan pengunjung` : "Belum ada ulasan pengunjung"}</p></div>
        {allReviews.length ? <div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleReviews.map((review, index) => <ReviewCard key={`${review.name}-${review.recipeSlug}-${review.date}-${index}`} review={review} />)}</div>{visibleReviews.length < allReviews.length && <button type="button" onClick={() => setReviewLimit((current) => current + reviewsPerPage)} className="mx-auto mt-6 flex min-h-11 items-center justify-center rounded-xl border border-[#dce5da] bg-white px-5 text-sm font-bold text-[#31593a] transition hover:bg-[#f2f6f0]">Tampilkan ulasan lainnya</button>}</div> : <div className="rounded-2xl border border-dashed border-[#dce4d9] bg-white p-6 text-sm leading-6 text-[#636c62] (4.68:1 terburuk)">Belum ada ulasan dari pengunjung. Buka halaman resep mana pun untuk membagikan pengalamanmu lebih dulu.</div>}
        {reviewsLoaded && allReviews.length === 0 && sampleShowcase.length > 0 && <div className="mt-6 rounded-2xl border border-[#ede4cc] bg-[#faf7ee] p-4 sm:p-5"><div className="flex flex-wrap items-center gap-2"><Badge tone="cream">Data contoh</Badge><h3 className="text-sm font-extrabold text-[#6b6146]">Contoh penulisan ulasan</h3></div><p className="mt-2 text-xs leading-5 text-[#716956] (4.67:1 terburuk)">{sampleReviews.length} contoh dibuat tim redaksi sebagai gambaran format ulasan; {sampleShowcase.length} di antaranya ditampilkan di sini. Ini bukan kiriman pengunjung dan tidak dihitung dalam rating maupun jumlah ulasan. Begitu ada ulasan pengunjung, contoh ini tidak lagi ditampilkan.</p><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{sampleShowcase.map((review, index) => <ReviewCard key={`contoh-${review.recipeSlug}-${index}`} review={review} />)}</div></div>}
      </div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reportResults.map((report) => <CommunityCard key={`${report.name}-${report.recipeSlug}`} report={report} showPhoto />)}</div>}
      <div className="mt-8 rounded-2xl border border-[#e5eae2] bg-[#f6f8f4] p-5 text-sm leading-6 text-[#636d62] (4.63:1 terburuk)">Semua kartu bertanda &ldquo;Data contoh&rdquo; dibuat tim redaksi sebagai gambaran format cerita — bukan kiriman pembaca. Hanya ulasan pengunjung yang dihitung sebagai rating komunitas. Keadaan cuaca, air, waktu, dan teknik pemancing tetap berpengaruh pada hasil sebenarnya.</div>
    </div>
  );
}
