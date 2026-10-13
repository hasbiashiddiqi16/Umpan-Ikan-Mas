"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Bot, X } from "lucide-react";
import { LOGO_ALT, LOGO_SRC } from "@/lib/brand";
import { markPromoSeen, shouldShowPromo } from "@/lib/promo-storage";
import { useHydrated } from "@/lib/use-location";

export type PromoFacts = {
  recipeCount: number;
  reviewCount: number;
  provinceCount: number;
};

const PROMO_IMAGE = "/images/promo-welcome.jpg";
/** Dashboard admin dan halaman login bukan bagian kunjungan publik. */
const EXCLUDED_PREFIXES = ["/dashboard", "/login"];
const DELAY_BEFORE_OPEN_MS = 1400;
const IDLE_BEFORE_OPEN_MS = 600;

const numberFormat = new Intl.NumberFormat("id-ID");

const features = [
  { emoji: "🎯", text: "Cari racikan dari cuaca, kondisi air, jenis kolam, dan budget." },
  { emoji: "🤖", text: "AI Umpan dan Sistem Pakar membantu meracik dari bahan yang kamu punya." },
  { emoji: "📍", text: "Izin lokasi opsional supaya kolom provinsi terisi otomatis." },
  { emoji: "🐟", text: "Semua resep memakai kroto 1 ons dan amis Deho / Sunbell." },
];

export function PromoModal({ facts }: { facts: PromoFacts }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    markPromoSeen();
  }, []);

  // Buka hanya pada kunjungan pertama, setelah halaman sempat tenang agar tidak
  // memotong interaksi atau mengganggu render awal.
  useEffect(() => {
    if (!hydrated) return;
    if (pathname && EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
    if (!shouldShowPromo()) return;

    let cancelled = false;
    const startedAt = Date.now();
    let lastInteractionAt = Date.now();
    const markInteraction = () => {
      lastInteractionAt = Date.now();
    };

    document.addEventListener("pointerdown", markInteraction, true);
    document.addEventListener("keydown", markInteraction, true);

    const timer = window.setInterval(() => {
      if (cancelled) return;
      const waitedLongEnough = Date.now() - startedAt >= DELAY_BEFORE_OPEN_MS;
      const userIsIdle = Date.now() - lastInteractionAt >= IDLE_BEFORE_OPEN_MS;
      if (!waitedLongEnough || !userIsIdle) return;
      window.clearInterval(timer);
      setOpen(true);
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("pointerdown", markInteraction, true);
      document.removeEventListener("keydown", markInteraction, true);
    };
  }, [hydrated, pathname]);

  // Kunci scroll, tangani Esc, dan jaga fokus tetap di dalam dialog.
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primaryRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = [...dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open, close]);

  if (!open) return null;

  const stats = [
    { value: numberFormat.format(facts.recipeCount), label: "racikan umpan" },
    { value: numberFormat.format(facts.reviewCount), label: "ulasan komunitas" },
    { value: numberFormat.format(facts.provinceCount), label: "provinsi" },
  ];

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center overflow-y-auto bg-[#0f1f16]/65 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-welcome-title"
        aria-describedby="promo-welcome-description"
        className="relative mt-auto w-full max-w-3xl overflow-hidden rounded-t-[28px] bg-[#fbfcf9] shadow-[0_30px_80px_rgba(12,26,18,.45)] sm:mt-0 sm:rounded-[30px]"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Tutup sambutan"
          className="absolute right-3.5 top-3.5 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/85 text-[#3c4b3e] shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X size={18} />
        </button>

        {/*
          Desktop: gambar jadi latar dan teks sambutan menumpuk di atasnya.
          Mobile: gambar jadi banner, teks sambutan turun ke bawah gambar supaya
          tetap terbaca tanpa perlu lapisan gelap selebar layar.
        */}
        <div className="relative flex flex-col sm:block sm:h-[256px]">
          <div className="relative h-[168px] w-full overflow-hidden bg-[#1c3a29] sm:absolute sm:inset-0 sm:h-full">
            <Image
              src={PROMO_IMAGE}
              alt="Ikan mas melompat di tepi kolam saat matahari terbit"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              loading="eager"
              className="object-cover object-[72%_center]"
            />
            <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(14,34,23,.95)_0%,rgba(16,38,26,.9)_54%,rgba(17,40,27,.72)_70%,rgba(18,44,30,.26)_100%)] sm:block" />
          </div>

          <div className="relative flex flex-col gap-2.5 px-5 pt-5 text-[#233a2a] sm:h-full sm:max-w-md sm:justify-center sm:p-7 sm:text-white">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#dfe5da] bg-[#f3f6f0] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#41604a] sm:border-white/20 sm:bg-white/10 sm:text-[#f0e2bd]">
              <Image src={LOGO_SRC} alt={LOGO_ALT} width={18} height={18} className="h-[18px] w-[18px]" />
              UMPAN MAS
            </span>
            <h2 id="promo-welcome-title" className="text-[25px] font-black leading-[1.12] tracking-[-.035em] sm:text-[34px]">
              Selamat datang, pemancing! 🎣
            </h2>
            <p id="promo-welcome-description" className="text-xs leading-5 text-[#5f6b60] sm:text-sm sm:leading-6 sm:text-white/90">
              Teman racik sebelum berangkat mancing: katalog umpan ikan mas lengkap dengan cuaca, kondisi air, dan pengalaman komunitas.
            </p>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-5 sm:max-h-none sm:p-7">
          <div className="grid grid-cols-3 gap-2.5">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-[#e6ebe3] bg-[#f6f8f4] px-2.5 py-3 text-center">
                <p className="text-lg font-black leading-none text-[#2c4634] sm:text-xl">{stat.value}</p>
                <p className="mt-1.5 text-[10px] font-semibold leading-4 text-[#66716a]">{stat.label}</p>
              </div>
            ))}
          </div>

          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature.text} className="flex items-start gap-2.5 rounded-2xl border border-[#eaece6] bg-white p-3.5 text-xs leading-5 text-[#4f5c51]">
                <span aria-hidden="true" className="text-base leading-none">{feature.emoji}</span>
                <span>{feature.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Link
              ref={primaryRef}
              href="/katalog"
              onClick={close}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-6 text-sm font-bold text-white transition hover:bg-[#1f3c29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294b34]"
            >
              Mulai jelajahi racikan <ArrowRight size={16} />
            </Link>
            <Link
              href="/ai-umpan"
              onClick={close}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dfe5da] bg-white px-6 text-sm font-bold text-[#3f5a43] transition hover:bg-[#f3f7f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294b34]"
            >
              <Bot size={16} /> Tanya AI Umpan
            </Link>
          </div>

          <p className="mt-4 text-[11px] leading-5 text-[#66716a]">
            Sambutan ini tampil sekali di perangkat ini dan bisa ditutup dengan tombol Esc atau area di luar kartu.
          </p>
        </div>
      </div>
    </div>
  );
}
