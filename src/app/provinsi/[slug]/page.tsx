import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { PageShell } from "@/components/navigation";
import { Footer, SectionHeader } from "@/components/shared";
import { ProvinceExplorer } from "@/components/province-explorer";
import { recipes } from "@/data/recipes";
import { provinces } from "@/data/provinces";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl, createPageMetadata } from "@/lib/seo";
import { getRecipeRatings } from "@/lib/review-summary";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const province = provinces.find((item) => item.slug === slug);
  if (!province) return { title: "Provinsi tidak ditemukan", robots: { index: false, follow: false } };

  return createPageMetadata({
    title: `Umpan Ikan Mas di ${province.name}`,
    description: `Temukan resep umpan ikan mas di ${province.name}, racikan yang dikaitkan dengan daerah, cuaca, dan kondisi kolam. Lihat bahan serta panduan komunitas.`,
    path: `/provinsi/${province.slug}`,
  });
}

export function generateStaticParams() {
  return provinces.map((province) => ({ slug: province.slug }));
}

export default async function ProvinceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const province = provinces.find((item) => item.slug === slug);
  if (!province) notFound();
  const regionalRecipes = recipes.filter((recipe) => recipe.provinces.includes(province.name));
  const displayedRecipes = regionalRecipes.length ? regionalRecipes : recipes.slice(0, 8);
  // Angka ulasan hanya dari ulasan asli yang sudah disetujui (bukan ulasan contoh).
  const recipeRatings = await getRecipeRatings();
  const visitorReviewCount = regionalRecipes.reduce((total, recipe) => total + (recipeRatings[recipe.slug]?.count ?? 0), 0);
  const popularCount = Math.min(province.recipeCount, 24);
  const provinceUrl = absoluteUrl(`/provinsi/${province.slug}`);
  const homeUrl = absoluteUrl("/");
  const provincesUrl = absoluteUrl("/provinsi");
  const pageDescription = `Temukan resep umpan ikan mas di ${province.name}, racikan yang dikaitkan dengan daerah, cuaca, dan kondisi kolam. Lihat bahan serta panduan komunitas.`;
  const breadcrumbStructuredData = provinceUrl && homeUrl && provincesUrl
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Provinsi", item: provincesUrl },
          { "@type": "ListItem", position: 3, name: `Umpan Ikan Mas di ${province.name}`, item: provinceUrl },
        ],
      }
    : undefined;
  const provinceStructuredData = provinceUrl
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": provinceUrl,
        url: provinceUrl,
        name: `Umpan Ikan Mas di ${province.name}`,
        description: pageDescription,
        inLanguage: "id-ID",
        about: {
          "@type": "AdministrativeArea",
          name: province.name,
          containedInPlace: { "@type": "Country", name: "Indonesia" },
        },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: displayedRecipes.slice(0, 12).map((recipe, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: recipe.name,
            url: absoluteUrl(`/resep/${recipe.slug}`),
          })),
        },
      }
    : undefined;
  return (
    <PageShell>
      {provinceStructuredData && <JsonLd data={provinceStructuredData} />}
      {breadcrumbStructuredData && <JsonLd data={breadcrumbStructuredData} />}
      <main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-7 sm:px-8 sm:pt-10">
        <nav aria-label="Breadcrumb" className="mb-5 text-sm font-semibold text-[#758176]">
          <ol className="flex min-w-0 items-center gap-2">
            <li><Link href="/" className="hover:text-[#355a3a]">Beranda</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/provinsi" className="inline-flex items-center gap-1.5 hover:text-[#355a3a]"><ArrowLeft size={14} /> Semua provinsi</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="truncate text-[#536253]">Umpan Ikan Mas di {province.name}</li>
          </ol>
        </nav>
        <section className="relative isolate overflow-hidden rounded-[28px] bg-[#203e2c] px-6 py-8 text-white sm:px-10 sm:py-11 lg:px-14">
          <div className="absolute -right-10 -top-20 -z-10 h-64 w-64 rounded-full border-[40px] border-white/[.045]" />
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#d5c38f]"><MapPin size={14} /> Racikan & pengalaman lokal</span>
          <h1 className="mt-3 text-4xl font-black tracking-[-.045em] sm:text-5xl">Umpan Ikan Mas di {province.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">Racikan yang dibagikan komunitas di {province.name}. Provinsi adalah salah satu indikator; karakter air setiap kolam tetap bisa berbeda.</p>
          <div className="mt-7 grid grid-cols-3 gap-2 sm:max-w-2xl sm:gap-3">
            {[{ value: province.recipeCount, label: "racikan tercatat", icon: BookOpen }, { value: visitorReviewCount, label: "ulasan pengunjung", icon: MessageCircle }, { value: popularCount, label: "racikan populer", icon: Sparkles }].map(({ value, label, icon: Icon }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.08] p-3.5 sm:p-4"><Icon size={16} className="text-[#dbc783]" /><p className="mt-3 text-xl font-black sm:text-2xl">{new Intl.NumberFormat("id-ID").format(value)}</p><p className="mt-1 text-[10px] leading-4 text-white/65 sm:text-xs">{label}</p></div>)}
          </div>
        </section>
        <div className="mt-6 rounded-xl border border-[#ede4cc] bg-[#faf7ee] px-4 py-3 text-xs leading-5 text-[#7b725d]">Angka ulasan dihitung hanya dari ulasan pengunjung yang sudah disetujui; ulasan contoh berlabel tidak ikut dihitung. Kondisi kolam, kualitas air, dan respons ikan tidak seragam di seluruh provinsi.</div>
        {regionalRecipes.length ? <ProvinceExplorer province={province.name} recipes={regionalRecipes} /> : <section className="mt-10"><SectionHeader eyebrow="Belum ada racikan spesifik" title="Mulai dari racikan komunitas populer" subtitle={`Belum ada sampel racikan yang ditandai khusus untuk ${province.name}. Pilihan berikut hanya referensi umum; karakter kolam lokal bisa berbeda.`} /><ProvinceExplorer province={province.name} recipes={displayedRecipes} /></section>}
      </main>
      <Footer />
    </PageShell>
  );
}
