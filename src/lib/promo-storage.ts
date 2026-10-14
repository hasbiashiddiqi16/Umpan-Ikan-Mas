export const PROMO_SEEN_KEY = "umpan-mas-promo-welcome-seen-v1";

/** Saklar pratinjau: `?sambutan=1` memaksa popup tampil walau penanda sudah ada. */
export const PROMO_FORCE_PARAM = "sambutan";

/**
 * Lama popup tidak tampil lagi setelah terakhir dilihat.
 *
 * Aturan pemunculan popup sambutan:
 * 1. Muncul pada kunjungan pertama;
 * 2. Muncul lagi setiap **sesi peramban baru** — mis. tab ditutup paksa
 *    (`sessionStorage` ikut terhapus, sedang `localStorage` tetap ada);
 * 3. Muncul lagi setelah **lewat 24 jam** sejak terakhir dilihat, termasuk pada
 *    tab yang dibiarkan terbuka lama.
 *
 * Nilai penanda: waktu terakhir dilihat dalam milidetik (epoch). Penanda lama
 * yang masih berbentuk `"1"` (dari versi sebelumnya) dianggap "pernah dilihat
 * tetapi waktunya tidak diketahui", sehingga popup tampil sekali lagi lalu
 * memakai penanda waktu yang baru.
 */
export const PROMO_SEEN_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Batas bawah waktu yang masuk akal untuk sebuah penanda (9 September 2001,
 * dalam milidetik). Nilai di bawah ini — termasuk penanda lama `"1"` — dianggap
 * "pernah dilihat, waktunya tidak diketahui".
 */
const MIN_REASONABLE_STAMP = 1_000_000_000_000;

/**
 * Penanda disimpan berlapis: `localStorage` (tetap antar kunjungan), lalu
 * `sessionStorage`, lalu memori. Kalau localStorage diblokir — mode privat, atau
 * halaman dibuka di dalam iframe yang di-sandbox — popup tetap tampil sekali per
 * sesi, bukan malah tidak pernah muncul.
 */
let memorySeen = false;
let memorySeenAt = 0;

function store(kind: "localStorage" | "sessionStorage"): Storage | null {
  try {
    return window[kind];
  } catch {
    // Akses propertinya sendiri bisa melempar di sebagian peramban.
    return null;
  }
}

/** Waktu terakhir dilihat menurut satu penyimpanan; `null` bila tidak ada/tak terbaca. */
function readStamp(target: Storage | null): number | null {
  if (!target) return null;
  try {
    const raw = target.getItem(PROMO_SEEN_KEY);
    if (!raw) return null;
    const nilai = Number(raw);
    return Number.isFinite(nilai) && nilai >= MIN_REASONABLE_STAMP ? nilai : null;
  } catch {
    return null;
  }
}

/** Apakah penyimpanan ini punya penanda sama sekali (termasuk bentuk lama `"1"`). */
function hasFlag(target: Storage | null): boolean {
  if (!target) return false;
  try {
    return target.getItem(PROMO_SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

function writeStamp(target: Storage | null, at: number): void {
  if (!target) return;
  try {
    target.setItem(PROMO_SEEN_KEY, String(at));
  } catch {
    // Penyimpanan lain (atau memori) tetap dipakai.
  }
}

function removeFlag(target: Storage | null): void {
  if (!target) return;
  try {
    target.removeItem(PROMO_SEEN_KEY);
  } catch {
    // Diabaikan: pemanggil tetap membersihkan penyimpanan lain.
  }
}

/** Apakah popup sudah dilihat pada sesi peramban yang sedang berjalan. */
export function hasSeenPromoThisSession(): boolean {
  if (typeof window === "undefined") return true;
  return memorySeen || hasFlag(store("sessionStorage"));
}

/** Waktu terakhir popup dilihat (epoch ms), atau `null` bila belum/tidak diketahui. */
export function lastSeenAt(): number | null {
  if (typeof window === "undefined") return null;
  const waktu = readStamp(store("localStorage")) ?? readStamp(store("sessionStorage"));
  if (waktu !== null) return waktu;
  return memorySeenAt > 0 ? memorySeenAt : null;
}

/** Apakah popup masih dalam masa sembunyi (sesi ini dan belum lewat 24 jam). */
export function hasSeenPromo(now = Date.now()): boolean {
  if (!hasSeenPromoThisSession()) return false;
  const waktu = lastSeenAt();
  return waktu !== null && now - waktu < PROMO_SEEN_WINDOW_MS;
}

/** Menandai popup sudah dilihat sekarang (dipakai saat popup ditutup). */
export function markPromoSeen(at = Date.now()): void {
  memorySeen = true;
  memorySeenAt = at;
  if (typeof window === "undefined") return;
  writeStamp(store("localStorage"), at);
  writeStamp(store("sessionStorage"), at);
}

/**
 * Mengosongkan penanda di memori saja.
 *
 * Penanda di memori adalah cadangan saat `localStorage` dan `sessionStorage`
 * sama-sama diblokir. Pada halaman baru isinya otomatis kosong; fungsi ini
 * dipakai uji untuk menirukan halaman/sesi yang benar-benar baru dibuka.
 */
export function resetPromoMemoryForTests(): void {
  memorySeen = false;
  memorySeenAt = 0;
}

/** Menghapus penanda di semua lapisan, mis. dari tombol "tampilkan lagi" di dashboard. */
export function clearPromoSeen(): void {
  memorySeen = false;
  memorySeenAt = 0;
  if (typeof window === "undefined") return;
  removeFlag(store("localStorage"));
  removeFlag(store("sessionStorage"));
}

export function isPromoForced(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get(PROMO_FORCE_PARAM) === "1";
  } catch {
    return false;
  }
}

/**
 * Tampil saat kunjungan pertama, saat sesi peramban baru (tab ditutup paksa),
 * setelah lewat 24 jam, atau selalu saat dipaksa lewat `?sambutan=1`.
 */
export function shouldShowPromo(now = Date.now()): boolean {
  if (isPromoForced()) return true;
  if (!hasSeenPromoThisSession()) return true;
  const waktu = lastSeenAt();
  if (waktu === null) return true;
  return now - waktu >= PROMO_SEEN_WINDOW_MS;
}

/** Kapan popup berikutnya boleh muncul; `null` bila belum ada penanda waktu. */
export function nextPromoDueAt(): number | null {
  const waktu = lastSeenAt();
  return waktu === null ? null : waktu + PROMO_SEEN_WINDOW_MS;
}
