/**
 * Peran dan kapabilitas admin dashboard (Task 114).
 *
 * Berkas ini murni definisi bersama (tanpa impor server) supaya bisa dipakai
 * skema basis data, logika sesi, route API, dan komponen klien sekaligus.
 * Penegakan izin yang menentukan tetap di server lewat `requireAdminApi()`;
 * daftar di sini hanya menentukan siapa boleh melakukan apa.
 */

export const ADMIN_ROLES = ["pemilik", "editor", "moderator", "hanya_lihat"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Username cadangan untuk admin utama dari environment; tidak bisa dipakai akun tambahan. */
export const PRIMARY_ADMIN_USERNAME = "admin";

export type AdminIdentity = {
  /** Username yang masuk; `admin` untuk admin utama dari environment. */
  sub: string;
  role: AdminRole;
  /** Versi sesi akun tambahan; sesi gugur bila versi di basis data naik. */
  sv: number;
  /** True bila admin utama dari environment (akses tertinggi, tidak terikat baris basis data). */
  primary: boolean;
};

export type AdminCapability =
  | "konten"
  | "moderasi"
  | "tampilan"
  | "analitik"
  | "pengguna"
  | "keamanan";

const ALL_CAPABILITIES: readonly AdminCapability[] = [
  "konten",
  "moderasi",
  "tampilan",
  "analitik",
  "pengguna",
  "keamanan",
];

/**
 * Matriks peran siap pakai:
 * - Pemilik: semua menu termasuk Pengguna & Keamanan.
 * - Editor: konten, moderasi, tampilan, dan analitik.
 * - Moderator: moderasi ulasan saja.
 * - Hanya-lihat: tanpa kapabilitas ubah; hanya membaca menu non-sensitif
 *   (semua permintaan ubah ditolak server).
 */
export const ROLE_CAPABILITIES: Record<AdminRole, readonly AdminCapability[]> = {
  pemilik: ALL_CAPABILITIES,
  editor: ["konten", "moderasi", "tampilan", "analitik"],
  moderator: ["moderasi"],
  hanya_lihat: [],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  pemilik: "Pemilik",
  editor: "Editor",
  moderator: "Moderator",
  hanya_lihat: "Hanya-lihat",
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  pemilik: "Akses penuh, termasuk mengelola admin lain serta menu Pengguna & Keamanan.",
  editor: "Mengelola konten resep, moderasi ulasan, tampilan, dan melihat analitik.",
  moderator: "Hanya memoderasi ulasan (setujui, tolak, sembunyikan).",
  hanya_lihat: "Hanya membaca menu non-sensitif; tidak bisa mengubah apa pun.",
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

export function canRole(role: AdminRole, capability: AdminCapability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}
