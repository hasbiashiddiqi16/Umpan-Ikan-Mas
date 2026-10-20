/**
 * Penanda "popup sambutan sudah dilihat".
 *
 * Aturan tampil untuk SATU versi popup: kunjungan pertama, setiap sesi
 * peramban baru (penanda sesi hilang saat peramban ditutup), dan lagi
 * setelah lewat 24 jam. Penanda disimpan PER VERSI popup: begitu admin
 * mengganti teks/gambar/status popup, versinya berubah dan pengunjung
 * melihat versi baru satu kali — tanpa menghapus cache secara manual.
 */

export const PROMO_SEEN_KEY = "umpan-mas-promo-welcome-seen-v2";
const PROMO_SEEN_LEGACY_KEY = "umpan-mas-promo-welcome-seen-v1";

/** Saklar pratinjau: `?sambutan=1` memaksa popup tampil walau penanda sudah ada. */
export const PROMO_FORCE_PARAM = "sambutan";

/** Lama satu versi popup tidak tampil lagi setelah terakhir dilihat. */
export const PROMO_SEEN_WINDOW_MS = 24 * 60 * 60 * 1000;

type PromoSeenRecord = { version: string; seenAt: number };

/** Cadangan in-memory bila storage peramban tidak tersedia/diblokir. */
let memoryRecord: PromoSeenRecord | null = null;

function store(kind: "localStorage" | "sessionStorage"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window[kind];
  } catch {
    // Akses propertinya sendiri bisa melempar di sebagian peramban.
    return null;
  }
}

function parseRecord(raw: string | null): PromoSeenRecord | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { version, seenAt } = parsed as { version?: unknown; seenAt?: unknown };
    if (typeof version !== "string" || version.length === 0) return null;
    if (typeof seenAt !== "number" || !Number.isFinite(seenAt) || seenAt <= 0) return null;
    return { version, seenAt };
  } catch {
    return null;
  }
}

function readRecord(target: Storage | null): PromoSeenRecord | null {
  if (!target) return null;
  try {
    return parseRecord(target.getItem(PROMO_SEEN_KEY));
  } catch {
    return null;
  }
}

function writeRecord(target: Storage | null, record: PromoSeenRecord): void {
  if (!target) return;
  try {
    target.setItem(PROMO_SEEN_KEY, JSON.stringify(record));
  } catch {
    // Penyimpanan lain (atau memori) tetap dipakai.
  }
}

function removeKey(target: Storage | null, key: string): void {
  if (!target) return;
  try {
    target.removeItem(key);
  } catch {
    // Diabaikan: pemanggil tetap membersihkan penyimpanan lain.
  }
}

/** Catatan terakhir dari semua lapisan (yang paling baru yang menang). */
function readPromoSeenRecord(): PromoSeenRecord | null {
  const candidates = [readRecord(store("localStorage")), readRecord(store("sessionStorage")), memoryRecord]
    .filter((record): record is PromoSeenRecord => record !== null);
  if (!candidates.length) return null;
  return candidates.reduce((latest, record) => (record.seenAt > latest.seenAt ? record : latest));
}

function readLegacySeenAt(): number | null {
  for (const target of [store("localStorage"), store("sessionStorage")]) {
    if (!target) continue;
    try {
      const raw = target.getItem(PROMO_SEEN_LEGACY_KEY);
      if (!raw) continue;
      const nilai = Number(raw);
      if (Number.isFinite(nilai) && nilai > 0) return nilai;
    } catch {
      // Abaikan lapisan yang tidak terbaca.
    }
  }
  return null;
}

export function isPromoForced(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get(PROMO_FORCE_PARAM) === "1";
  } catch {
    return false;
  }
}

/** Apakah popup (versi ini, bila disebut) sudah dilihat pada sesi berjalan. */
export function hasSeenPromoThisSession(version?: string): boolean {
  if (memoryRecord && (version === undefined || memoryRecord.version === version)) return true;
  const sessionRecord = readRecord(store("sessionStorage"));
  if (!sessionRecord) return false;
  return version === undefined || sessionRecord.version === version;
}

/** Waktu terakhir popup (versi ini, bila disebut) dilihat; `null` bila belum. */
export function lastSeenAt(version?: string): number | null {
  const record = readPromoSeenRecord();
  if (record) return version === undefined || record.version === version ? record.seenAt : null;
  // Tanpa catatan berversi, hormati stempel format lama untuk pemanggil lama.
  return version === undefined ? readLegacySeenAt() : null;
}

/** Apakah popup masih dalam masa sembunyi (sesi ini dan belum lewat 24 jam). */
export function hasSeenPromo(version?: string | number, now = Date.now()): boolean {
  const versi = typeof version === "string" ? version : undefined;
  const waktuAcuan = typeof version === "number" ? version : now;
  if (!hasSeenPromoThisSession(versi)) return false;
  const waktu = lastSeenAt(versi);
  return waktu !== null && waktuAcuan - waktu < PROMO_SEEN_WINDOW_MS;
}

/** Menandai popup versi ini sudah dilihat sekarang (dipakai saat popup ditutup). */
export function markPromoSeen(version: string, at = Date.now()): void {
  const record: PromoSeenRecord = { version, seenAt: at };
  memoryRecord = record;
  writeRecord(store("localStorage"), record);
  writeRecord(store("sessionStorage"), record);
}

/**
 * Mengosongkan penanda di memori saja (dipakai uji untuk menirukan
 * halaman/sesi yang benar-benar baru dibuka).
 */
export function resetPromoMemoryForTests(): void {
  memoryRecord = null;
}

/** Menghapus penanda di semua lapisan, mis. dari tombol "tampilkan lagi" di dashboard. */
export function clearPromoSeen(): void {
  memoryRecord = null;
  if (typeof window === "undefined") return;
  removeKey(store("localStorage"), PROMO_SEEN_KEY);
  removeKey(store("sessionStorage"), PROMO_SEEN_KEY);
  removeKey(store("localStorage"), PROMO_SEEN_LEGACY_KEY);
  removeKey(store("sessionStorage"), PROMO_SEEN_LEGACY_KEY);
}

/**
 * Tampil saat: dipaksa `?sambutan=1`, versi ini belum pernah dilihat,
 * sesi peramban baru, atau sudah lewat 24 jam sejak versi ini terakhir
 * dilihat. Versi yang berubah selalu boleh tampil satu kali.
 */
export function shouldShowPromo(version?: string, now = Date.now()): boolean {
  if (isPromoForced()) return true;
  if (version !== undefined) {
    const record = readPromoSeenRecord();
    if (!record || record.version !== version) return true;
    if (!hasSeenPromoThisSession(version)) return true;
    return now - record.seenAt >= PROMO_SEEN_WINDOW_MS;
  }
  if (!hasSeenPromoThisSession()) return true;
  const waktu = lastSeenAt();
  if (waktu === null) return true;
  return now - waktu >= PROMO_SEEN_WINDOW_MS;
}

/** Kapan popup versi ini boleh muncul lagi; `null` bila boleh tampil sekarang. */
export function nextPromoDueAt(version?: string): number | null {
  if (version !== undefined) {
    const record = readPromoSeenRecord();
    if (!record || record.version !== version) return null;
    return record.seenAt + PROMO_SEEN_WINDOW_MS;
  }
  const waktu = lastSeenAt();
  return waktu === null ? null : waktu + PROMO_SEEN_WINDOW_MS;
}
