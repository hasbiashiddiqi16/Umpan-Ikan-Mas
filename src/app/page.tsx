import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Bot, ChevronRight, Sparkles } from "lucide-react";
import { PageShell } from "@/components/navigation";
import { Hero } from "@/components/hero";
import { QuickFinder } from "@/components/quick-finder";
import { RecipeCard } from "@/components/recipe-card";
import { WeatherCard, ProvinceCard, CommunityCard } from "@/components/cards";
import { Footer, SectionHeader } from "@/components/shared";
import { RecipeCardSkeleton } from "@/components/skeletons";
import { defaultPreferences, type Recipe } from "@/data/recipes";
import { provinces } from "@/data/provinces";
import { fishingReports } from "@/data/fishingReports";
import { getRecommendedRecipes } from "@/lib/recommendation";
import { getRecipeRatings } from "@/lib/review-summary";
import { countRecipesForProvince, getPublicRecipes } from "@/lib/public-recipes";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Umpan Ikan Mas Indonesia | UMPAN MAS",
    description: "Temukan resep umpan ikan mas untuk kolam di DKI Jakarta berdasarkan cuaca, kondisi air, dan jenis kolam.",
    path: "/",
    includeBrandInSocialTitle: false,
  }),
  verification: {
    google: "ksR7woDfyr120REWdc8Keka9ionxwZMLodsD4P-4r9M",
  },
};

/** Resep paling banyak diulas di sebuah provinsi — dihitung dari tabel ulasan. */
function popularRecipeFor(provinceName: string, ratings: Record<string, { count: number; average: number }>, publicRecipes: Recipe[]) {
  const kandidat = publicRecipes
    .filter((recipe) => recipe.provinces.includes(provinceName) && (ratings[recipe.slug]?.count ?? 0) > 0)
    .sort((a, b) => (ratings[b.slug]?.count ?? 0) - (ratings[a.slug]?.count ?? 0));
  return kandidat[0]?.name;
}

const popularProvinceNames = ["Jawa Barat", "Jawa Tengah", "Jawa Timur", "Banten", "DKI Jakarta", "Sumatera Utara", "Riau", "Sumatera Selatan", "Lampung", "Bali"];

/**
 * ISR: halaman ini dirender di server dan disimpan sebagai HTML statis,
 * lalu dibangun ulang di latar belakang paling lambat tiap jam. Angka
 * rating/ulasan dari database jadi ikut segar tanpa halaman berubah
 * menjadi render dinamis per kunjungan (yang menunda konten dan memicu
 * layar loading). 3600 detik = seimbang antara kesegaran dan beban server.
 */
export const revalidate = 3600;

/**
 * Dua seksi yang urutannya ditentukan rating pengunjung. Sengaja dipisah
 * sebagai komponen server async di dalam `Suspense`: halaman induk sinkron
 * sehingga hero (elemen LCP) dan seksi statis langsung ada di HTML awal,
 * bukan tertahan menunggu query rating — pengunjung tidak lagi disambut
 * layar loading menyeluruh.
 */
async function RatedRecipeSections() {
  const ratings = await getRecipeRatings();
  const publicRecipes = await getPublicRecipes();
  const bestRecommendations = getRecommendedRecipes(publicRecipes, defaultPreferences, ratings).slice(0, 3);
  const popularRecipes = [...publicRecipes]
    .sort((a, b) => (ratings[b.slug]?.count ?? 0) - (ratings[a.slug]?.count ?? 0) || (ratings[b.slug]?.average ?? 0) - (ratings[a.slug]?.average ?? 0))
    .slice(0, 5);
  const adaUlasan = Object.values(ratings).some((rating) => rating.count > 0);
  return (
    <>
      <section>
        <SectionHeader eyebrow="Pilihan sistem" title="Rekomendasi Terbaik" subtitle="Racikan pilihan redaksi untuk kolam di DKI Jakarta; rating muncul setelah ada ulasan pengunjung." action={<Link href="/katalog" className="inline-flex items-center gap-2 text-sm font-bold text-[#355a3b] hover:underline">Lihat semua <ArrowRight size={16} /></Link>} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{bestRecommendations.map((recipe) => <RecipeCard key={recipe.slug} recipe={recipe} initialRating={ratings[recipe.slug]} />)}</div>
      </section>
      <section>
        <SectionHeader eyebrow={adaUlasan ? "Paling banyak ulasan" : "Kurasi redaksi"} title={adaUlasan ? "Racikan Populer" : "Racikan Pilihan"} subtitle={adaUlasan ? "Diurutkan dari jumlah ulasan pengunjung yang sudah disetujui." : "Dari umpan harian sampai racikan untuk lomba, dikurasi redaksi sampai ada ulasan pengunjung."} action={<Link href="/katalog" className="inline-flex items-center gap-2 text-sm font-bold text-[#355a3b] hover:underline">Buka katalog <ArrowRight size={16} /></Link>} />
        <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-5 scrollbar-none sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 xl:grid-cols-5">{popularRecipes.map((recipe) => <div key={recipe.slug} className="w-[292px] shrink-0 snap-start sm:w-[320px] lg:w-auto"><RecipeCard recipe={recipe} initialRating={ratings[recipe.slug]} /></div>)}</div>
      </section>
    </>
  );
}

/** Grid provinsi populer; label resep terpopuler per provinsi berasal dari rating. */
async function PopularProvinceGrid() {
  const ratings = await getRecipeRatings();
  const publicRecipes = await getPublicRecipes();
  const popularProvinces = provinces.filter((province) => popularProvinceNames.includes(province.name));
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">{popularProvinces.map((province) => <ProvinceCard key={province.slug} province={{ ...province, recipeCount: countRecipesForProvince(publicRecipes, province.name) }} popularRecipe={popularRecipeFor(province.name, ratings, publicRecipes)} />)}</div>;
}

/** Penampung selama pulau rating dimuat: meniru tata letak aslinya. */
function RatedSectionsSkeleton() {
  return (
    <>
      {[0, 1].map((section) => (
        <section key={section} aria-hidden="true">
          <div className="mb-8">
            <div className="mb-3 h-3 w-28 animate-pulse rounded bg-[#e9eee6]" />
            <div className="h-8 w-64 animate-pulse rounded bg-[#e9eee6]" />
            <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-[#f0f3ed]" />
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((card) => <RecipeCardSkeleton key={card} />)}
          </div>
        </section>
      ))}
    </>
  );
}

/** Penampung grid provinsi selama label populernya dimuat. */
function ProvinceGridSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => <div key={item} className="h-[104px] animate-pulse rounded-[20px] bg-[#edf1eb]" />)}
    </div>
  );
}

export default function HomePage() {
  // Halaman ini sengaja TIDAK async: hero dan seksi statis langsung masuk
  // HTML awal (SSG/ISR). Hanya seksi yang urutannya bergantung pada rating
  // pengunjung yang menunggu data — di dalam `Suspense` di bawah — dan semua
  // angka komunitas tetap berasal dari satu sumber: tabel ulasan.
  return (
    <PageShell>
      <main className="pb-16 lg:pb-0">
        <Hero />
        <div className="mx-auto max-w-7xl space-y-16 px-5 pt-8 sm:space-y-20 sm:px-8 sm:pt-12 lg:pt-14">
          <QuickFinder />
          <Suspense fallback={<RatedSectionsSkeleton />}><RatedRecipeSections /></Suspense>
          <section>
            <SectionHeader eyebrow="Baca situasinya" title="Pilih Berdasarkan Cuaca" subtitle="Cuaca berpengaruh pada suhu dan aktivitas ikan. Temukan racikan untuk kondisimu." action={<Link href="/cuaca" className="inline-flex items-center gap-2 text-sm font-bold text-[#355a3b] hover:underline">Panduan cuaca <ArrowRight size={16} /></Link>} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((index) => <WeatherCard key={index} index={index} />)}</div>
          </section>
          <section>
            <SectionHeader eyebrow="Dari berbagai daerah" title="Umpan Berdasarkan Provinsi" subtitle="Temukan racikan populer di sekitar spotmu. Karakter air bisa berbeda di setiap kolam." action={<Link href="/provinsi" className="inline-flex items-center gap-2 text-sm font-bold text-[#355a3b] hover:underline">Lihat 38 provinsi <ArrowRight size={16} /></Link>} />
            <Suspense fallback={<ProvinceGridSkeleton />}><PopularProvinceGrid /></Suspense>
            <p className="mt-4 rounded-xl bg-[#f3f5f0] px-4 py-3 text-xs leading-5 text-[#656d64] (4.59:1 terburuk)">Provinsi merupakan salah satu indikator rekomendasi. Karakter air setiap kolam dapat berbeda, bahkan dalam satu daerah.</p>
          </section>
          <section>
            <SectionHeader eyebrow="Dari pinggir kolam" title="Cerita Pemancing" subtitle="Pengalaman nyata membantu kita memahami bagaimana racikan bekerja di kondisi yang berbeda." action={<Link href="/komunitas" className="inline-flex items-center gap-2 text-sm font-bold text-[#355a3b] hover:underline">Lihat semua cerita <ArrowRight size={16} /></Link>} />
            <div className="grid gap-4 lg:grid-cols-3">{fishingReports.slice(0, 3).map((report) => <CommunityCard key={`${report.name}-${report.recipeSlug}`} report={report} />)}</div>
          </section>
          <section className="relative isolate overflow-hidden rounded-[28px] bg-[#1e3d2b] px-6 py-9 text-white sm:px-10 sm:py-12 lg:px-14">
            <div className="absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full border-[42px] border-white/[.04]" /><div className="absolute -bottom-36 right-40 -z-10 h-72 w-72 rounded-full border-[32px] border-[#d5b66f]/[.09]" />
            <div className="grid gap-7 md:grid-cols-[1fr_auto] md:items-center">
              <div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#e5d5a9]"><Sparkles size={14} /> Rekomendasi yang terasa personal</span><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Kondisi kolammu unik.<br className="hidden sm:block" /> Racikanmu juga bisa lebih pas.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/70 sm:text-base">Jawab beberapa pertanyaan singkat dan temukan racikan yang paling mendekati cuaca, air, serta jenis kolammu.</p></div>
              <Link href="/sistem-pakar" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e7bd66] px-6 text-sm font-extrabold text-[#263722] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#f0cb7a]"><Bot size={18} /> Coba Sistem Pakar <ChevronRight size={17} /></Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}
