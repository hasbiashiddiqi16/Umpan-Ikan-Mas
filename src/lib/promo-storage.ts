export const PROMO_SEEN_KEY = "umpan-mas-promo-welcome-seen-v1";

/** Saklar pratinjau: `?sambutan=1` memaksa popup tampil walau penanda sudah ada. */
export const PROMO_FORCE_PARAM = "sambutan";

/**
 * Penanda "sudah melihat sambutan" disimpan berlapis: localStorage (tetap antar
 * kunjungan), lalu sessionStorage, lalu memori. Kalau localStorage diblokir —
 * mode privat, atau halaman dibuka di dalam iframe yang di-sandbox — popup
 * tetap tampil sekali per sesi, bukan malah tidak pernah muncul.
 */
let memorySeen = false;

function store(kind: "localStorage" | "sessionStorage"): Storage | null {
  try {
    return window[kind];
  } catch {
    // Akses propertinya sendiri bisa melempar di sebagian peramban.
    return null;
  }
}

function readFlag(target: Storage | null): boolean {
  if (!target) return false;
  try {
    return target.getItem(PROMO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeFlag(target: Storage | null): void {
  if (!target) return;
  try {
    target.setItem(PROMO_SEEN_KEY, "1");
  } catch {
    // Penyimpanan lain (atau memori) tetap dipakai.
  }
}

export function hasSeenPromo(): boolean {
  if (typeof window === "undefined") return true;
  return memorySeen || readFlag(store("localStorage")) || readFlag(store("sessionStorage"));
}

export function markPromoSeen(): void {
  memorySeen = true;
  if (typeof window === "undefined") return;
  writeFlag(store("localStorage"));
  writeFlag(store("sessionStorage"));
}

export function isPromoForced(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get(PROMO_FORCE_PARAM) === "1";
  } catch {
    return false;
  }
}

/** Tampil saat kunjungan pertama, atau selalu saat dipaksa lewat `?sambutan=1`. */
export function shouldShowPromo(): boolean {
  return isPromoForced() || !hasSeenPromo();
}
