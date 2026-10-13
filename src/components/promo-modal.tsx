"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { markPromoSeen, shouldShowPromo } from "@/lib/promo-storage";
import { useHydrated } from "@/lib/use-location";

/**
 * Poster sambutan dibuat utuh sebagai gambar (teks ikut di dalam gambar) oleh
 * `scripts/build-promo-poster.mjs`. Dua berkas terpisah dipakai agar ukurannya
 * pas di ponsel maupun layar lebar, masing-masing 2x dari ukuran tampilnya
 * supaya teks tetap tajam di layar rapat.
 */
const POSTER = {
  mobile: { src: "/images/promo-welcome-mobile.jpg", width: 860, height: 1280 },
  desktop: { src: "/images/promo-welcome-desktop.jpg", width: 1640, height: 1040 },
};

/**
 * Tombol di dalam gambar tidak bisa diklik, jadi di atas tiap tombol dipasang
 * tautan bening. Angkanya persen terhadap poster, dihitung oleh skrip pembuat
 * poster (lihat keluaran "Koordinat tombol").
 */
type Cta = { href: string; label: string; left: number; top: number; width: number; height: number };

const CTAS: Record<keyof typeof POSTER, Cta[]> = {
  mobile: [
    { href: "/katalog", label: "Mulai jelajahi racikan — buka Katalog", left: 6.51, top: 87.81, width: 42.21, height: 6.88 },
    { href: "/ai-umpan", label: "Tanya AI Umpan", left: 51.28, top: 87.81, width: 42.21, height: 6.88 },
  ],
  desktop: [
    { href: "/katalog", label: "Mulai jelajahi racikan — buka Katalog", left: 5.37, top: 86.73, width: 23.61, height: 9.23 },
    { href: "/ai-umpan", label: "Tanya AI Umpan", left: 30.44, top: 86.73, width: 16.91, height: 9.23 },
  ],
};

const DESCRIPTION =
  "Katalog umpan ikan mas lengkap dengan cuaca, kondisi air, dan pengalaman komunitas: 200 racikan, 5.000 ulasan, dan 38 provinsi. " +
  "Tersedia AI Umpan dan Sistem Pakar, kolom provinsi bisa terisi otomatis bila lokasi diizinkan, dan semua resep memakai kroto 1 ons serta bahan amis Deho / Sunbell.";

/** Dashboard admin dan halaman login bukan bagian kunjungan publik. */
const EXCLUDED_PREFIXES = ["/dashboard", "/login"];
const DELAY_BEFORE_OPEN_MS = 1400;
const IDLE_BEFORE_OPEN_MS = 600;

export function PromoModal() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryMobileRef = useRef<HTMLAnchorElement>(null);
  const primaryDesktopRef = useRef<HTMLAnchorElement>(null);
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
    // Fokuskan tombol ajakan pada poster yang benar-benar tampil di layar ini
    // (ponsel dan layar lebar punya poster masing-masing).
    const primary =
      [primaryDesktopRef.current, primaryMobileRef.current].find((el) => el && el.offsetParent !== null) ??
      primaryMobileRef.current;
    primary?.focus();

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
        className="relative mt-auto w-full max-w-[430px] overflow-hidden rounded-t-[28px] bg-[#0f2a1c] shadow-[0_30px_80px_rgba(12,26,18,.45)] sm:mt-0 sm:max-w-[820px] sm:rounded-[30px]"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Tutup sambutan"
          className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/85 text-[#3c4b3e] shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-5 sm:top-5"
        >
          <X size={18} />
        </button>

        {/* Poster ponsel: portrait, teks di bawah gambar. */}
        <div className="relative sm:hidden">
          <Image
            src={POSTER.mobile.src}
            width={POSTER.mobile.width}
            height={POSTER.mobile.height}
            alt=""
            unoptimized
            loading="eager"
            className="h-auto w-full"
          />
          {CTAS.mobile.map((cta, index) => (
            <Link
              key={cta.href}
              ref={index === 0 ? primaryMobileRef : undefined}
              href={cta.href}
              onClick={close}
              aria-label={cta.label}
              className="absolute rounded-[18px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{ left: `${cta.left}%`, top: `${cta.top}%`, width: `${cta.width}%`, height: `${cta.height}%` }}
            />
          ))}
        </div>

        {/* Poster layar lebar: lanskap, teks di sisi kiri gambar. */}
        <div className="relative hidden sm:block">
          <Image
            src={POSTER.desktop.src}
            width={POSTER.desktop.width}
            height={POSTER.desktop.height}
            alt=""
            unoptimized
            loading="eager"
            className="h-auto w-full"
          />
          {CTAS.desktop.map((cta, index) => (
            <Link
              key={cta.href}
              ref={index === 0 ? primaryDesktopRef : undefined}
              href={cta.href}
              onClick={close}
              aria-label={cta.label}
              className="absolute rounded-[20px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{ left: `${cta.left}%`, top: `${cta.top}%`, width: `${cta.width}%`, height: `${cta.height}%` }}
            />
          ))}
        </div>

        {/* Pembaca layar tetap mendapat isi poster sebagai teks. */}
        <div className="sr-only">
          <h2 id="promo-welcome-title">Selamat datang, pemancing!</h2>
          <p id="promo-welcome-description">{DESCRIPTION}</p>
        </div>
      </div>
    </div>
  );
}
