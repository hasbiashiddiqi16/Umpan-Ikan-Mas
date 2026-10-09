import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPinned } from "lucide-react";
import { PageShell } from "@/components/navigation";
import { Footer, SectionHeader } from "@/components/shared";
import { ProvinceCard } from "@/components/cards";
import { provinces } from "@/data/provinces";

export const metadata: Metadata = {
  title: "Umpan Ikan Mas Berdasarkan Provinsi",
  description: "Jelajahi racikan dan cerita mancing ikan mas dari 38 provinsi di Indonesia.",
};

export default function ProvincesPage() {
  return (
    <PageShell>
      <main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <div className="relative isolate mb-10 overflow-hidden rounded-[28px] bg-[#203e2c] px-6 py-9 text-white sm:px-10 sm:py-12 lg:px-14">
          <div className="absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full border-[38px] border-white/[.04]" />
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-[#dfd0a8]"><MapPinned size={14} /> Cerita dari penjuru Nusantara</span>
          <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-[-.045em] sm:text-5xl">Umpan Berdasarkan Provinsi</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">Temukan racikan yang dibagikan pemancing di berbagai daerah. Setiap kolam punya karakter air dan kebiasaan ikan yang bisa berbeda.</p>
          <div className="mt-6 flex flex-wrap gap-3"><span className="rounded-xl bg-white/10 px-4 py-3 text-sm"><strong className="text-lg">38</strong><span className="ml-2 text-white/70">provinsi</span></span><span className="rounded-xl bg-white/10 px-4 py-3 text-sm"><strong className="text-lg">20+</strong><span className="ml-2 text-white/70">racikan lokal</span></span></div>
        </div>
        <SectionHeader eyebrow="Jelajahi daerah" title="Pilih provinsimu" subtitle="Data ini adalah gambaran komunitas dan katalog UMPAN MAS, bukan representasi seluruh spot di daerah." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">{provinces.map((province) => <ProvinceCard key={province.slug} province={province} />)}</div>
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#e5eae3] bg-white p-5 sm:flex-row sm:items-center sm:p-6"><div><p className="text-sm font-extrabold text-[#344638]">Belum yakin pilih racikan?</p><p className="mt-1 text-sm text-[#7b857a]">Coba rekomendasi berdasarkan cuaca, kondisi air, dan budget.</p></div><Link href="/ai-umpan" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white">Tanya AI Umpan <ArrowRight size={15} /></Link></div>
      </main>
      <Footer />
    </PageShell>
  );
}
