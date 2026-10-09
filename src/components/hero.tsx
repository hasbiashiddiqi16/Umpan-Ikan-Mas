import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, CloudRain, ShieldCheck, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative isolate mx-auto mt-4 min-h-[510px] max-w-[1440px] overflow-hidden rounded-[28px] bg-[#173326] sm:mx-6 sm:mt-6 sm:min-h-[560px] sm:rounded-[34px] lg:mx-8">
      <Image src="/images/pond-hero.jpg" alt="Pemancing menikmati suasana kolam pagi berkabut" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(15,37,27,.94)_0%,rgba(19,44,31,.84)_38%,rgba(18,43,31,.48)_67%,rgba(18,43,31,.14)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(12,31,22,.35),transparent_50%)]" />
      <div className="relative mx-auto flex min-h-[510px] max-w-7xl items-center px-6 py-12 sm:min-h-[560px] sm:px-10 lg:px-16">
        <div className="max-w-[650px]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/90 backdrop-blur-sm">
            <Sparkles size={14} className="text-[#e7c277]" /> Racikan lokal, rekomendasi lebih relevan
          </div>
          <h1 className="max-w-[620px] text-[clamp(2.5rem,7vw,5.4rem)] font-black leading-[.99] tracking-[-.055em] text-white">
            Temukan Umpan Ikan Mas yang <span className="text-[#e9ca87]">Tepat.</span>
          </h1>
          <p className="mt-5 max-w-[500px] text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
            Rekomendasi racikan berdasarkan lokasi, cuaca, kondisi air, dan jenis kolam. Biar setiap sesi punya awal yang lebih yakin.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="#finder" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e4b75c] px-6 text-sm font-bold text-[#263622] shadow-[0_10px_30px_rgba(213,168,76,.22)] transition hover:-translate-y-0.5 hover:bg-[#efc872] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              🎯 Cari Umpan Saya <ArrowRight size={17} />
            </Link>
            <Link href="/katalog" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Jelajahi Katalog <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-white/75 sm:text-sm">
            <span className="inline-flex items-center gap-2"><CloudRain size={16} className="text-[#d9c18a]" /> Sesuai kondisi kolam</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-[#d9c18a]" /> Berbasis pengalaman pemancing</span>
            <a href="#finder" className="hidden items-center gap-1 text-white/80 transition hover:text-white md:inline-flex">Mulai jelajah <ArrowDown size={14} /></a>
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 right-7 hidden rounded-2xl border border-white/15 bg-[#19382a]/55 px-4 py-3 text-white backdrop-blur-md md:block">
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/65">Berbagi racikan</p>
        <p className="mt-1 text-sm font-bold">Dari pemancing, untuk pemancing</p>
      </div>
    </section>
  );
}
