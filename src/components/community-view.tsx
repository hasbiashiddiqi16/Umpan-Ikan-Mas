"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Trophy, Waves } from "lucide-react";
import { fishingReports } from "@/data/fishingReports";
import { reviews } from "@/data/reviews";
import { COMMUNITY_REVIEWS_EVENT, readCommunityReviews } from "@/lib/community-storage";
import { CommunityCard } from "@/components/cards";
import { ReviewCard } from "@/components/recipe-details";

const tabs = ["Semua", "Hasil Mancing", "Racikan", "Review"];

export function CommunityView() {
  const [activeTab, setActiveTab] = useState("Semua");
  const [memberReviews, setMemberReviews] = useState<ReturnType<typeof readCommunityReviews>>([]);
  const [approvedReviews, setApprovedReviews] = useState<typeof reviews>([]);
  useEffect(() => {
    const sync = () => setMemberReviews(readCommunityReviews());
    sync();
    const controller = new AbortController();
    void fetch("/api/public/reviews", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ reviews?: typeof reviews }> : { reviews: [] })
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
  const serverOnlyReviews = useMemo(() => approvedReviews.filter((remote) => !memberReviews.some((local) => local.name === remote.name && local.comment === remote.comment)), [approvedReviews, memberReviews]);
  const allReviews = useMemo(() => [...memberReviews, ...serverOnlyReviews, ...reviews], [memberReviews, serverOnlyReviews]);
  const reportResults = useMemo(() => {
    if (activeTab === "Hasil Mancing") return fishingReports.filter((report) => report.catchCount > 0);
    if (activeTab === "Racikan") return fishingReports.filter((report) => Boolean(report.recipeSlug));
    return fishingReports;
  }, [activeTab]);

  return (
    <div>
      <div className="relative isolate mb-8 overflow-hidden rounded-[28px] bg-[#203e2c] px-6 py-9 text-white sm:px-10 sm:py-12"><div className="absolute -right-12 -top-16 -z-10 h-56 w-56 rounded-full border-[34px] border-white/[.05]" /><span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#dfd0a5]"><MessageCircle size={15} /> Cerita dari pinggir kolam</span><h1 className="mt-4 text-4xl font-black tracking-[-.045em] sm:text-5xl">Komunitas Pemancing</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">Berbagi kondisi, racikan, dan cerita hasil mancing. Setiap pengalaman berbeda—semoga jadi inspirasi untuk sesi berikutnya.</p><div className="mt-6 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs"><Trophy size={14} /> Hasil mancing</span><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs"><Waves size={14} /> Berbagai kondisi kolam</span></div></div>
      <div className="mb-6 flex gap-2 overflow-x-auto" role="tablist" aria-label="Filter cerita komunitas">{tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold transition ${activeTab === tab ? "bg-[#294b34] text-white" : "bg-white text-[#69766a] hover:bg-[#eef3eb]"}`}>{tab}</button>)}</div>
      {activeTab === "Review" ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{allReviews.map((review, index) => <ReviewCard key={`${review.name}-${review.recipeSlug}-${review.date}-${index}`} review={review} />)}</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reportResults.map((report) => <CommunityCard key={`${report.name}-${report.recipeSlug}`} report={report} showPhoto />)}</div>}
      <div className="mt-8 rounded-2xl border border-[#e5eae2] bg-[#f6f8f4] p-5 text-sm leading-6 text-[#737e72]">Cerita dan jumlah tangkapan adalah laporan anggota komunitas, bukan hasil yang dijamin. Keadaan cuaca, air, waktu, dan teknik pemancing ikut berpengaruh.</div>
    </div>
  );
}
