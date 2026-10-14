/**
 * Nama kolom dan header yang dipakai bersama oleh klien dan server.
 *
 * Dipisah dari `review-guard.ts` supaya komponen peramban bisa membacanya tanpa
 * ikut menarik modul server (yang memuat koneksi basis data).
 */

/** Header berisi token perangkat anonim dari peramban. */
export const REVIEW_DEVICE_HEADER = "x-review-device";

/** Kolom jebakan (honeypot) yang tidak boleh diisi manusia. */
export const REVIEW_HONEYPOT_FIELD = "website";
