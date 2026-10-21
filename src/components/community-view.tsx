"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MessageCircle, Trophy, Waves } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { RecipeReview } from "@/data/reviews";
import { COMMUNITY_REVIEWS_EVENT, readCommunityReviews, sebagaiUlasanPublik } from "@/lib/community-storage";
import { Badge } from "@/components/shared";
import { ReviewCard } from "@/components/recipe-details";

const tabs = ["Semua", "Racikan", "Review"];
const reviewsPerPage = 24;

type ResepKomunitas = {
  slug: string;
  title: string;
  image?: string;
  author?: string;
  summary?: string;
  fishingTypes?: string[];
  weather?: string[];
  water?: string[];
  dariKomunitas?: boolean;
  tanggalBagikan?: string;
};

export function CommunityView({ embedded = false }: { embedded?: boolean }) {
  const [activeTab, setActiveTab] = useState("Semua");
  const [memberReviews, setMemberReviews] = useState<ReturnType<typeof readCommunityReviews>>([]);
  const [approvedReviews, setApprovedReviews] = useState<RecipeReview[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [reviewLimit, setReviewLimit] = useState(reviewsPerPage);
  const [communityRecipes, setCommunityRecipes] = useState<ResepKomunitas[]>([]);
  const [publishedSlugs, setPublishedSlugs] = useState<string[]>([]);
  const [recipesLoaded, setRecipesLoaded] = useState(false);
  useEffect(() => {
    const sync = () => setMemberReviews(readCommunityReviews());
    sync();
    const controller = new AbortController();
    void fetch("/api/public/reviews", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ reviews?: RecipeReview[] }> : { reviews: [] })
      .then((body) => setApprovedReviews(body.reviews ?? []))
      .catch(() => undefined)
      .finally(() => setReviewsLoaded(true));
    void fetch("/api/public/recipes", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ recipes?: ResepKomunitas[] }> : { recipes: [] })
      .then((body) => { const recipes = body.recipes ?? []; setPublishedSlugs(recipes.map((resep) => resep.slug)); setCommunityRecipes(recipes.filter((resep) => resep.dariKomunitas)); })
      .catch(() => undefined)
      .finally(() => setRecipesLoaded(true));
    window.addEventListener(COMMUNITY_REVIEWS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      controller.abort();
      window.removeEventListener(COMMUNITY_REVIEWS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  // Salinan lokal yang sudah punya versi server digantikan versi server
  // (sumber kebenaran status); yang belum ada di server berarti kiriman
  // pengirim sendiri yang masih ditahan, tampil berlabel menunggu.
  // Salinan lokal hanya tampil bila resepnya masih terbit. Salinan untuk resep
  // yang sudah dihapus tidak boleh hidup lagi sebagai cerita komunitas.
  const memberOnlyReviews = useMemo(() => memberReviews.filter((local) => recipesLoaded && publishedSlugs.includes(local.recipeSlug) && !approvedReviews.some((remote) => remote.name === local.name && remote.comment === local.comment)), [approvedReviews, memberReviews, publishedSlugs, recipesLoaded]);
  // Angka dan daftar ulasan hanya dari kiriman pengunjung asli.
  const allReviews = useMemo(() => [...memberOnlyReviews.map(sebagaiUlasanPublik), ...approvedReviews], [memberOnlyReviews, approvedReviews]);
  const visibleReviews = useMemo(() => allReviews.slice(0, reviewLimit), [allReviews, reviewLimit]);

  const daftarUlasan = (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-extrabold text-[#394a3b]">Ulasan komunitas</p><p className="text-xs text-[#666d66] (4.57:1 terburuk)">{allReviews.length ? `Menampilkan ${visibleReviews.length} dari ${allReviews.length} ulasan pengunjung` : "Belum ada ulasan pengunjung"}</p></div>
      {allReviews.length ? <div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleReviews.map((review, index) => <ReviewCard key={`${review.name}-${review.recipeSlug}-${review.date}-${index}`} review={review} />)}</div>{visibleReviews.length < allReviews.length && <button type="button" onClick={() => setReviewLimit((current) => current + reviewsPerPage)} className="mx-auto mt-6 flex min-h-11 items-center justify-center rounded-xl border border-[#dce5da] bg-white px-5 text-sm font-bold text-[#31593a] transition hover:bg-[#f2f6f0]">Tampilkan ulasan lainnya</button>}</div> : <div className="rounded-2xl border border-dashed border-[#dce4d9] bg-white p-6 text-sm leading-6 text-[#636c62] (4.68:1 terburuk)">Belum ada ulasan dari pengunjung. Buka halaman resep mana pun untuk membagikan pengalamanmu lebih dulu.</div>}
    </div>
  );

  const daftarRacikan = (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-extrabold text-[#394a3b]">Racikan dari komunitas</p><p className="text-xs text-[#666d66] (4.57:1 terburuk)">{communityRecipes.length} racikan dibagikan warga lewat halaman Bagikan</p></div>
      {communityRecipes.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{communityRecipes.map((resep) => <KartuResepKomunitas key={resep.slug} resep={resep} />)}</div> : <div className="rounded-2xl border border-dashed border-[#dce4d9] bg-white p-6 text-sm leading-6 text-[#636c62] (4.68:1 terburuk)">Belum ada racikan yang dibagikan pengunjung. Bagikan racikan andalanmu lewat tombol di atas — langsung tayang di katalog dan tampil di sini.</div>}
    </div>
  );

  return (
    <div>
      {!embedded && <div className="relative isolate mb-8 overflow-hidden rounded-[28px] bg-[#203e2c] px-6 py-9 text-white sm:px-10 sm:py-12"><div className="absolute -right-12 -top-16 -z-10 h-56 w-56 rounded-full border-[34px] border-white/[.05]" /><span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#dfd0a5]"><MessageCircle size={15} /> Cerita dari pinggir kolam</span><h1 className="mt-4 text-4xl font-black tracking-[-.045em] sm:text-5xl">Komunitas Pemancing</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">Berbagi kondisi, racikan, dan cerita hasil mancing. Setiap pengalaman berbeda—semoga jadi inspirasi untuk sesi berikutnya.</p><div className="mt-6 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs"><Trophy size={14} /> Hasil mancing</span><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs"><Waves size={14} /> Berbagai kondisi kolam</span></div></div>}
      <div className="mb-6 flex gap-2 overflow-x-auto" role="tablist" aria-label="Filter cerita komunitas">{tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => { setActiveTab(tab); setReviewLimit(reviewsPerPage); }} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold transition ${activeTab === tab ? "bg-[#294b34] text-white" : "bg-white text-[#616d62] (4.65:1 terburuk) hover:bg-[#eef3eb]"}`}>{tab}</button>)}</div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[#294b34] px-5 py-4 text-white">
        <div><p className="text-sm font-extrabold">Punya racikan andalan?</p><p className="mt-0.5 text-xs leading-5 text-white/70">Bagikan racikanmu — langsung tayang di katalog dan tampil di sub-tab Racikan komunitas ini.</p></div>
        <Link href="/bagikan" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#294b34] transition hover:bg-[#eef3eb]">Bagikan Racikan Andalanmu <ArrowRight size={16} /></Link>
      </div>
      {activeTab === "Review" ? daftarUlasan : activeTab === "Racikan" ? daftarRacikan : (
        <div className="space-y-10">
          {communityRecipes.length > 0 && daftarRacikan}
          {(!reviewsLoaded || allReviews.length > 0 || communityRecipes.length === 0) && daftarUlasan}
        </div>
      )}
      <div className="mt-8 rounded-2xl border border-[#e5eae2] bg-[#f6f8f4] p-5 text-sm leading-6 text-[#636d62] (4.63:1 terburuk)">Semua racikan dan ulasan di halaman ini adalah kiriman pengunjung. Hanya ulasan pengunjung yang dihitung sebagai rating komunitas. Keadaan cuaca, air, waktu, dan teknik pemancing tetap berpengaruh pada hasil sebenarnya.</div>
    </div>
  );
}

function KartuResepKomunitas({ resep }: { resep: ResepKomunitas }) {
  const tanggal = resep.tanggalBagikan ? new Date(resep.tanggalBagikan) : null;
  const tanggalLabel = tanggal && !Number.isNaN(tanggal.getTime()) ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(tanggal) : null;
  const chips = [resep.fishingTypes?.[0], resep.weather?.[0], resep.water?.[0]].filter(Boolean) as string[];
  return (
    <Link href={`/resep/${resep.slug}`} className="group overflow-hidden rounded-[22px] border border-[#e7ebe5] bg-white shadow-[0_8px_28px_rgba(39,56,41,.04)] transition hover:shadow-[0_12px_32px_rgba(39,56,41,.09)]">
      <div className="relative h-40 w-full overflow-hidden bg-[#eef3eb]">
        <Image src={resep.image || "/images/pond-hero.jpg"} alt={`Foto racikan ${resep.title}`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-1.5"><Badge tone="dark">Racikan komunitas</Badge>{chips.map((chip) => <Badge key={chip}>{chip}</Badge>)}</div>
        <h3 className="mt-2 text-base font-extrabold text-[#2b3b2d]">{resep.title}</h3>
        <p className="mt-1 text-xs text-[#666d66] (4.57:1 terburuk)">oleh {resep.author || "Pemancing UMPAN MAS"}{tanggalLabel ? ` · ${tanggalLabel}` : ""}</p>
        {resep.summary && <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#57614f]">{resep.summary}</p>}
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#355a3b] group-hover:underline">Lihat resep <ArrowRight size={15} /></span>
      </div>
    </Link>
  );
}
