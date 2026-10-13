export const PROMO_SEEN_KEY = "umpan-mas-promo-welcome-seen-v1";

/** Popup sambutan hanya tampil satu kali per perangkat. */
export function hasSeenPromo(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PROMO_SEEN_KEY) === "1";
  } catch {
    // Penyimpanan tidak tersedia (mode privat): jangan tampilkan popup berulang.
    return true;
  }
}

export function markPromoSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROMO_SEEN_KEY, "1");
  } catch {
    // Diabaikan: popup tetap tertutup untuk sesi berjalan.
  }
}

export function shouldShowPromo(): boolean {
  return !hasSeenPromo();
}
