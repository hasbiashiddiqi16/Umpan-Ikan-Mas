/**
 * Aturan tanggal ulasan.
 *
 * Ulasan tidak boleh bertanggal masa depan: tanggal masa depan adalah tanda
 * data palsu atau jam perangkat yang salah. Nilai seperti itu ditolak di server
 * (API) dan diperbaiki saat disimpan (dipangkas ke waktu server).
 */

/** Toleransi jam klien yang sedikit berbeda dari jam server (±60 detik). */
export const REVIEW_CLOCK_SKEW_MS = 60_000;

/** Apakah tanggal melewati batas yang wajar (lebih dari `now` + toleransi)? */
export function isFutureReviewDate(value: Date | number | string | null | undefined, now: Date = new Date()): boolean {
  if (value === null || value === undefined) return false;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(time)) return false;
  return time > now.getTime() + REVIEW_CLOCK_SKEW_MS;
}

/**
 * Memastikan tanggal tersimpan tidak berada di masa depan.
 * Tanggal tidak valid atau terlalu jauh di depan diganti dengan waktu server.
 */
export function clampReviewCreatedAt(value: Date | number | string | null | undefined, now: Date = new Date()): Date {
  if (value === null || value === undefined) return now;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(time)) return now;
  return new Date(Math.min(time, now.getTime()));
}
