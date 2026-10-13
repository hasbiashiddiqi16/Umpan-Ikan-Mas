"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
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
  mobile: { src: "/images/promo-welcome-mobile.jpg", width: 860, height: 1216 },
  desktop: { src: "/images/promo-welcome-desktop.jpg", width: 1640, height: 1040 },
};

/** Sisa ruang di tepi layar (padanan `p-3` di ponsel dan `p-6` di layar lebar). */
const VIEWPORT_MARGIN_PX = 48;

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
  // Popup ini murni informasi dan tidak boleh di-scroll, jadi poster dikunci
  // agar selalu muat utuh di tinggi layar yang tersedia.
  const [maxPosterHeight, setMaxPosterHeight] = useState<number>();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    markPromoSeen();
  }, []);

  useEffect(() => {
    const update = () => setMaxPosterHeight(Math.max(280, window.innerHeight - VIEWPORT_MARGIN_PX));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // Buka pada kunjungan pertama (atau selalu saat `?sambutan=1` dipakai untuk
  // pratinjau), setelah halaman sempat tenang agar tidak memotong interaksi.
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

  // Kunci scroll halaman, tangani Esc, dan tahan fokus di tombol tutup.
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

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
      className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-[#0f1f16]/65 p-3 backdrop-blur-sm sm:p-6"
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
        style={{ maxHeight: maxPosterHeight }}
        className="relative w-fit max-w-[430px] overflow-hidden rounded-[28px] bg-[#0f2a1c] shadow-[0_30px_80px_rgba(12,26,18,.45)] sm:max-w-[820px] sm:rounded-[30px]"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={close}
          aria-label="Tutup sambutan"
          className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/85 text-[#3c4b3e] shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-5 sm:top-5"
        >
          <X size={18} />
        </button>

        {/* Poster ponsel: portrait, teks di bawah gambar. */}
        <div className="sm:hidden">
          <Image
            src={POSTER.mobile.src}
            width={POSTER.mobile.width}
            height={POSTER.mobile.height}
            alt=""
            unoptimized
            loading="eager"
            style={{ maxHeight: maxPosterHeight }}
            className="block h-auto w-auto max-w-full"
          />
        </div>

        {/* Poster layar lebar: lanskap, teks di sisi kiri gambar. */}
        <div className="hidden sm:block">
          <Image
            src={POSTER.desktop.src}
            width={POSTER.desktop.width}
            height={POSTER.desktop.height}
            alt=""
            unoptimized
            loading="eager"
            style={{ maxHeight: maxPosterHeight }}
            className="block h-auto w-auto max-w-full"
          />
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
