/**
 * Aturan password dashboard yang dipakai bersama oleh server (saat menyimpan)
 * dan formulir di dashboard (supaya kesalahan ketahuan sebelum dikirim).
 *
 * Berkas ini sengaja bebas dari API Node maupun basis data agar aman diimpor
 * komponen klien.
 */

export const ADMIN_PASSWORD_MIN_LENGTH = 8;
export const ADMIN_PASSWORD_MAX_LENGTH = 200;

/** Ditampilkan sebagai daftar syarat di kartu Keamanan dashboard. */
export const ADMIN_PASSWORD_RULES = [
  `Minimal ${ADMIN_PASSWORD_MIN_LENGTH} karakter, maksimal ${ADMIN_PASSWORD_MAX_LENGTH}.`,
  "Tanpa spasi di awal atau akhir.",
  "Berbeda dari password yang sedang dipakai.",
  "Ketik dua kali agar tidak salah ketik.",
] as const;

export type PasswordChangeInput = { current: string; next: string; confirm: string };

/** Memeriksa password baru saja (tanpa membandingkan dengan password lama). */
export function validateNewPassword(value: unknown): { value?: string; error?: string } {
  if (typeof value !== "string" || value.length === 0) return { error: "Password baru wajib diisi." };
  if (value !== value.trim()) return { error: "Password tidak boleh diawali atau diakhiri spasi." };
  if (value.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return { error: `Password baru minimal ${ADMIN_PASSWORD_MIN_LENGTH} karakter.` };
  }
  if (value.length > ADMIN_PASSWORD_MAX_LENGTH) {
    return { error: `Password baru maksimal ${ADMIN_PASSWORD_MAX_LENGTH} karakter.` };
  }
  return { value };
}

/**
 * Memeriksa seluruh isian formulir ganti password. Dipakai server sebelum
 * memverifikasi password lama, dan dipakai dashboard untuk memberi tahu lebih
 * dulu tanpa perlu memanggil server.
 */
export function validatePasswordChange(body: unknown): { data?: PasswordChangeInput; error?: string } {
  const source = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};

  const current = source.current;
  if (typeof current !== "string" || current.length === 0) {
    return { error: "Password saat ini wajib diisi." };
  }

  const next = validateNewPassword(source.next);
  if (!next.value) return { error: next.error };

  if (next.value === current) {
    return { error: "Password baru harus berbeda dari password saat ini." };
  }

  if (typeof source.confirm !== "string" || source.confirm.length === 0) {
    return { error: "Ulangi password baru terlebih dahulu." };
  }
  if (source.confirm !== next.value) {
    return { error: "Ulangan password tidak sama dengan password baru." };
  }

  return { data: { current, next: next.value, confirm: source.confirm } };
}
