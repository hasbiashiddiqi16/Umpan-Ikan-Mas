import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { PageShell } from "@/components/navigation";
import { Footer, SectionHeader } from "@/components/shared";
import { ProvinceExplorer } from "@/components/province-explorer";
import { recipes } from "@/data/recipes";
import { provinces } from "@/data/provinces";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const province = provinces.find((item) => item.slug === slug);
  return province ? { title: `Umpan Ikan Mas ${province.name}`, description: `Jelajahi racikan ikan mas dan cerita pemancing dari ${province.name}. Kondisi setiap kolam dapat berbeda.` } : { title: "Provinsi tidak ditemukan" };
}

export function generateStaticParams() {
  return provinces.map((province) => ({ slug: province.slug }));
}

export default async function ProvinceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const province = provinces.find((item) => item.slug === slug);
  if (!province) notFound();
  const regionalRecipes = recipes.filter((recipe) => recipe.provinces.includes(province.name));
  const popularCount = Math.min(province.recipeCount, 24);
  return (
    <PageShell>
      <main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-7 sm:px-8 sm:pt-10">
        <Link href="/provinsi" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#758176] hover:text-[#355a3a]"><ArrowLeft size={16} /> Semua provinsi</Link>
        <section className="relative isolate overflow-hidden rounded-[28px] bg-[#203e2c] px-6 py-8 text-white sm:px-10 sm:py-11 lg:px-14">
          <div className="absolute -right-10 -top-20 -z-10 h-64 w-64 rounded-full border-[40px] border-white/[.045]" />
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#d5c38f]"><MapPin size={14} /> Racikan & pengalaman lokal</span>
          <h1 className="mt-3 text-4xl font-black tracking-[-.045em] sm:text-5xl">{province.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">Racikan yang dibagikan komunitas di {province.name}. Provinsi adalah salah satu indikator; karakter air setiap kolam tetap bisa berbeda.</p>
          <div className="mt-7 grid grid-cols-3 gap-2 sm:max-w-2xl sm:gap-3">
            {[{ value: province.recipeCount, label: "racikan tercatat", icon: BookOpen }, { value: province.reportCount, label: "laporan mancing", icon: MessageCircle }, { value: popularCount, label: "racikan populer", icon: Sparkles }].map(({ value, label, icon: Icon }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.08] p-3.5 sm:p-4"><Icon size={16} className="text-[#dbc783]" /><p className="mt-3 text-xl font-black sm:text-2xl">{new Intl.NumberFormat("id-ID").format(value)}</p><p className="mt-1 text-[10px] leading-4 text-white/65 sm:text-xs">{label}</p></div>)}
          </div>
        </section>
        <div className="mt-6 rounded-xl border border-[#ede4cc] bg-[#faf7ee] px-4 py-3 text-xs leading-5 text-[#7b725d]">Data daerah dan jumlah laporan merupakan gambaran komunitas pada katalog. Kondisi kolam, kualitas air, dan respons ikan tidak seragam di seluruh provinsi.</div>
        {regionalRecipes.length ? <ProvinceExplorer province={province.name} recipes={regionalRecipes} /> : <section className="mt-10"><SectionHeader eyebrow="Belum ada racikan spesifik" title={`Mulai dari racikan komunitas populer`} subtitle={`Belum ada sampel racikan yang ditandai khusus untuk ${province.name}. Pilihan berikut hanya referensi umum; karakter kolam lokal bisa berbeda.`} /><ProvinceExplorer province={province.name} recipes={recipes.slice(0, 8)} /></section>}
      </main>
      <Footer />
    </PageShell>
  );
}
