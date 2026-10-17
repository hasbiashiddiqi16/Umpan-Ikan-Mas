"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image, { getImageProps } from "next/image";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  defaultAppearance,
  mergeAppearance,
  type AppearanceState,
  type PopupFeature,
  type PopupIcon,
} from "@/lib/appearance";
import { LOGO_ALT, LOGO_SRC } from "@/lib/brand";
import { isPromoForced, markPromoSeen, nextPromoDueAt, shouldShowPromo } from "@/lib/promo-storage";
import { useHydrated } from "@/lib/use-location";

/**
 * Dua mode tampilan popup, keduanya dirender pada kartu ber-rasio tetap:
 *
 * - `poster`: gambar poster siap pakai (bawaan atau unggahan dari dashboard).
 * - `teks`: gambar latar + teks yang diisi dari dashboard. Ukuran huruf memakai
 *   satuan `cqw` (persen lebar kartu) supaya tata letaknya sama persis di semua
 *   ukuran layar — inilah yang membuat popup tetap muat tanpa perlu di-scroll.
 *
 * Kartu dibatasi lebar dan tinggi layar, jadi rasio tetap + ukuran huruf
 * proporsional menjamin seluruh isi selalu terlihat utuh.
 */
/**
 * Bingkai popup mode teks. Dipakai juga oleh pratinjau di dashboard supaya
 * yang dilihat admin sama dengan yang dilihat pengunjung.
 */
export const POPUP_LATAR_RATIO = "43 / 64";
const MAX_WIDTH = { mobile: 430 } as const;
/** Sisa ruang di tepi layar (padanan `p-3` ponsel dan `p-6` layar lebar). */
const VIEWPORT_MARGIN_PX = 48;

/** Dashboard admin dan halaman login bukan bagian kunjungan publik. */
const EXCLUDED_PREFIXES = ["/dashboard", "/login"];
const DELAY_BEFORE_OPEN_MS = 1400;
const IDLE_BEFORE_OPEN_MS = 600;

export function PopupIcon({ icon, className }: { icon: PopupIcon; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {icon === "target" && (<><circle cx="12" cy="12" r="8.5" {...common} /><circle cx="12" cy="12" r="3" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="#0f2a1c" /></>)}
      {icon === "spark" && (<path d="M12 2.5l1.6 6.2 6.2 1.6-6.2 1.6L12 18.1l-1.6-6.2L4.2 10.3l6.2-1.6z" fill="currentColor" />)}
      {icon === "pin" && (<><path d="M12 3.5a5.5 5.5 0 0 1 3.4 9.8c-.6.5-1 .9-1.2 1.6l-.4 1.3h-3.6l-.4-1.3c-.2-.7-.6-1.1-1.2-1.6A5.5 5.5 0 0 1 12 3.5z" {...common} /><path d="M12 20.5v-2.3" {...common} /></>)}
      {icon === "fish" && (<><ellipse cx="11" cy="12" rx="6" ry="3.6" fill="currentColor" /><path d="M17 12l4-2.6v5.2z" fill="currentColor" /><circle cx="8.6" cy="11.3" r=".8" fill="#0f2a1c" /></>)}
    </svg>
  );
}

type PromoModalProps = {
  /** Dipakai dashboard untuk pratinjau: pengaturan langsung, tanpa membaca API. */
  override?: AppearanceState;
  /** Pratinjau: langsung terbuka, tidak menyimpan penanda, tidak menunda. */
  preview?: boolean;
  /** Dipanggil saat popup ditutup (dipakai pratinjau untuk menyembunyikan kartu). */
  onClose?: () => void;
};

export function PromoModal({ override, preview = false, onClose }: PromoModalProps) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(preview);
  // `?sambutan=1` memaksa popup tampil, termasuk saat popup dinonaktifkan dari
  // dashboard: berguna untuk memeriksa karya sebelum diaktifkan kembali.
  const [forced, setForced] = useState(false);
  const [appearance, setAppearance] = useState<AppearanceState | null>(override ? mergeAppearance(override) : null);
  const [settingsSettled, setSettingsSettled] = useState(Boolean(override) || preview);
  const [posterTerjadwal, setPosterTerjadwal] = useState(false);
  const [maxHeight, setMaxHeight] = useState<number>();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    if (!preview) markPromoSeen();
    onClose?.();
  }, [onClose, preview]);

  // Tinggi kartu dibatasi sisa tinggi layar supaya tidak ada bagian yang perlu digulir.
  useEffect(() => {
    const update = () => setMaxHeight(Math.max(260, window.innerHeight - VIEWPORT_MARGIN_PX));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // Pengaturan tampilan diambil sekali saat halaman dibuka. Bila permintaan
  // gagal (mis. sedang luring), nilai bawaan dipakai agar popup tetap tampil.
  useEffect(() => {
    if (override) return;
    let active = true;
    fetch("/api/appearance", { cache: "force-cache" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: AppearanceState | null) => {
        if (!active) return;
        if (data) setAppearance(mergeAppearance(data));
        setSettingsSettled(true);
      })
      .catch(() => {
        if (active) setSettingsSettled(true);
      });
    return () => { active = false; };
  }, [override]);

  const settings = mergeAppearance(appearance).popup;
  // Props poster per lebar layar (untuk <picture> di bawah): hanya varian
  // yang cocok dengan layar yang diunduh; juga dipakai tautan preload.
  const { props: posterMobile } = getImageProps({ src: settings.media.mobile.url, width: 860, height: 1280, alt: "", sizes: "(max-width: 640px) 92vw, 430px" });
  const { props: posterDesktop } = getImageProps({ src: settings.media.desktop.url, width: 1640, height: 1040, alt: "", sizes: "(max-width: 900px) 92vw, 820px" });

  // Kapan popup boleh tampil:
  // - kunjungan pertama, atau sesi peramban baru (mis. tab ditutup paksa), atau
  //   sudah lewat 24 jam sejak terakhir dilihat — dibuka setelah halaman sempat
  //   tenang agar tidak memotong interaksi;
  // - tab yang dibiarkan terbuka lama: begitu pengunjung kembali, popup tampil
  //   bila jatah 24 jamnya sudah lewat.
  useEffect(() => {
    if (preview) return;
    if (!hydrated) return;
    if (pathname && EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

    let cancelled = false;
    let delayTimer: number | undefined;
    let dueTimer: number | undefined;

    const openNow = () => {
      if (cancelled) return;
      if (delayTimer !== undefined) { window.clearInterval(delayTimer); delayTimer = undefined; }
      if (dueTimer !== undefined) { window.clearTimeout(dueTimer); dueTimer = undefined; }
      setForced(isPromoForced());
      setOpen(true);
    };

    const startedAt = Date.now();
    let lastInteractionAt = Date.now();
    const markInteraction = () => {
      lastInteractionAt = Date.now();
    };

    if (shouldShowPromo()) {
      document.addEventListener("pointerdown", markInteraction, true);
      document.addEventListener("keydown", markInteraction, true);

      delayTimer = window.setInterval(() => {
        if (cancelled) return;
        // Popup akan tampil begitu halaman tenang: siapkan poster dari
        // sekarang agar dialog langsung bergambar saat terbuka (menekan LCP).
        setPosterTerjadwal(true);
        const waitedLongEnough = Date.now() - startedAt >= DELAY_BEFORE_OPEN_MS;
        const userIsIdle = Date.now() - lastInteractionAt >= IDLE_BEFORE_OPEN_MS;
        if (!waitedLongEnough || !userIsIdle) return;
        openNow();
      }, 250);
    } else {
      // Masih dalam masa sembunyi: jadwalkan pemunculan berikutnya pada saat
      // jatah 24 jamnya habis (tab boleh tetap terbuka).
      const dueAt = nextPromoDueAt();
      if (dueAt !== null) {
        dueTimer = window.setTimeout(() => {
          if (shouldShowPromo()) openNow();
        }, Math.max(1_000, dueAt - Date.now()));
      }
    }

    // Timer di tab latar bisa tertunda (peramban menidurkan tab), jadi saat tab
    // kembali aktif keadaannya diperiksa ulang.
    const onVisibilityChange = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      if (shouldShowPromo()) openNow();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      setPosterTerjadwal(false);
      if (delayTimer !== undefined) window.clearInterval(delayTimer);
      if (dueTimer !== undefined) window.clearTimeout(dueTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("pointerdown", markInteraction, true);
      document.removeEventListener("keydown", markInteraction, true);
    };
  }, [hydrated, pathname, preview]);

  // Kunci scroll halaman, tangani Esc, dan tahan fokus di dalam dialog.
  useEffect(() => {
    if (!open || !settingsSettled) return;
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
  }, [close, open, settingsSettled]);

  if (!open || !settingsSettled || (!preview && !forced && !settings.enabled)) {
    // Popup belum tampil tetapi sudah terjadwal dalam mode poster: muat
    // poster lebih dulu lewat preload (hanya varian yang cocok dengan lebar
    // layar yang diunduh) agar dialog langsung tampil utuh saat terbuka.
    if (!open && posterTerjadwal && settingsSettled && settings.enabled && settings.mode === "poster") {
      return (
        <>
          <link rel="preload" as="image" media="(max-width: 639px)" imageSrcSet={posterMobile.srcSet} imageSizes={posterMobile.sizes} fetchPriority="high" />
          <link rel="preload" as="image" media="(min-width: 640px)" imageSrcSet={posterDesktop.srcSet} imageSizes={posterDesktop.sizes} fetchPriority="high" />
        </>
      );
    }
    return null;
  }

  const posterMode = settings.mode === "poster";
  const deskripsi = `${settings.judul} ${settings.ringkasan} ${settings.statistik.map((stat) => `${stat.value} ${stat.label}`).join(", ")}.`;

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
        style={{ maxHeight }}
        className={`relative w-full overflow-hidden rounded-[26px] bg-[#0f2a1c] shadow-[0_30px_80px_rgba(12,26,18,.45)] sm:rounded-[30px] ${
          posterMode ? "max-w-[430px] sm:max-w-[820px]" : "max-w-[430px]"
        }`}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={close}
          aria-label="Tutup sambutan"
          className="absolute right-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-full bg-white/85 text-[#3c4b3e] shadow-sm backdrop-blur transition-[background-color] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-5 sm:top-5"
        >
          <X size={18} />
        </button>

        {/* Poster ponsel / layar lebar: gambar sudah memuat seluruh informasi. */}
        {posterMode && (
          <picture>
            <source media="(min-width: 640px)" srcSet={posterDesktop.srcSet} sizes={posterDesktop.sizes} width={1640} height={1040} />
            {/* <img> dari getImageProps agar <picture> memilih satu varian saja. */}
            <img {...posterMobile} alt="" style={{ maxHeight }} className="block aspect-[860/1280] h-auto w-full sm:aspect-[1640/1040]" />
          </picture>
        )}

        {/* Mode teks: satu susunan untuk semua layar, dipusatkan seperti poster. */}
        {!posterMode && (
          <div
            className="relative w-full"
            style={{ aspectRatio: POPUP_LATAR_RATIO, maxWidth: MAX_WIDTH.mobile, maxHeight, margin: "0 auto", containerType: "inline-size" }}
          >
            <Image src={settings.media.latar.url} alt="" fill sizes="430px" className="object-cover object-center" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,28,19,.72)_0%,rgba(11,28,19,.62)_42%,rgba(11,28,19,.88)_100%)]" />
            <PopupText settings={settings} compact={false} />
          </div>
        )}

        {/* Pembaca layar tetap mendapat isi popup sebagai teks. */}
        <div className="sr-only">
          <h2 id="promo-welcome-title">{settings.judul}</h2>
          <p id="promo-welcome-description">{deskripsi}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Teks popup mode `teks`. Semua ukuran memakai `cqw` (persen lebar kartu),
 * sehingga tampilan tetap proporsional di semua ukuran layar dan tidak pernah
 * perlu digulir. `compact` dipakai kartu sempit di ponsel.
 */
function PopupText({ settings, compact }: { settings: AppearanceState["popup"]; compact: boolean }) {
  const pad = compact ? "6.5cqw" : "5.4cqw";
  return (
    <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: pad, gap: "2.6cqw" }}>
      <span
        className="inline-flex w-fit items-center rounded-full border border-white/25 bg-white/10 font-bold uppercase text-[#f0e2bd]"
        style={{ gap: "1.8cqw", padding: "1.4cqw 2.6cqw", fontSize: "2.3cqw", letterSpacing: ".16em" }}
      >
        <Image src={LOGO_SRC} alt={LOGO_ALT} width={40} height={40} className="shrink-0" style={{ width: "4.6cqw", height: "4.6cqw" }} />
        UMPAN MAS
      </span>

      <h2 className="font-black leading-[1.1] tracking-[-.03em] text-white" style={{ fontSize: "7.4cqw" }}>
        {settings.judul}
      </h2>

      <p className="leading-[1.5] text-white/85" style={{ fontSize: "2.9cqw" }}>
        {settings.ringkasan}
      </p>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${settings.statistik.length}, minmax(0, 1fr))`, gap: "2cqw" }}>
        {settings.statistik.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 text-center" style={{ padding: "2.2cqw 1.6cqw" }}>
            <p className="font-black leading-none text-white" style={{ fontSize: "4.6cqw" }}>{stat.value}</p>
            <p className="font-semibold leading-tight text-white/75" style={{ fontSize: "2.1cqw", marginTop: "1.2cqw" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <ul className="grid" style={{ gap: "1.8cqw" }}>
        {settings.fitur.map((feature: PopupFeature) => (
          <li key={feature.text} className="flex items-start text-white/90" style={{ gap: "2.2cqw", fontSize: "2.5cqw" }}>
            <span className="grid shrink-0 place-items-center rounded-full bg-white/12 text-[#f0e2bd]" style={{ width: "5.4cqw", height: "5.4cqw" }}>
              <PopupIcon icon={feature.icon} className="w-[3.2cqw]" />
            </span>
            <span className="leading-snug">{feature.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
