/**
 * Bentuk data pengaturan tampilan situs yang dikelola dari dashboard:
 * logo, dan popup sambutan. Modul ini sengaja bebas dari akses database agar
 * bisa dipakai komponen klien (editor dashboard) maupun server.
 */

export const MEDIA_KEYS = ["logo", "logo-footer", "hero", "popup-mobile", "popup-desktop", "popup-latar"] as const;
export type MediaKey = (typeof MEDIA_KEYS)[number];

/** Berkas bawaan yang dipakai selama belum ada unggahan dari dashboard. */
export const MEDIA_DEFAULTS: Record<MediaKey, string> = {
  logo: "/images/logo-umpan-mas.png",
  // Berkas terpisah untuk footer, supaya bisa memakai versi logo yang warnanya
  // cocok dengan teks putih di latar hijau gelap (navbar tetap memakai `logo`).
  "logo-footer": "/images/logo-footer.png",
  // Gambar besar di bagian paling atas beranda.
  hero: "/images/pond-hero.jpg",
  "popup-mobile": "/images/promo-welcome-mobile.jpg",
  "popup-desktop": "/images/promo-welcome-desktop.jpg",
  "popup-latar": "/images/promo-welcome.jpg",
};

export const MEDIA_LABELS: Record<MediaKey, string> = {
  logo: "Logo situs",
  "logo-footer": "Logo footer",
  hero: "Gambar hero (beranda)",
  "popup-mobile": "Poster popup · ponsel",
  "popup-desktop": "Poster popup · layar lebar",
  "popup-latar": "Latar popup mode teks",
};

/** Batas ukuran unggahan per jenis aset (byte). */
export const MEDIA_MAX_BYTES: Record<MediaKey, number> = {
  logo: 1_500_000,
  "logo-footer": 1_500_000,
  hero: 3_000_000,
  "popup-mobile": 3_000_000,
  "popup-desktop": 3_000_000,
  "popup-latar": 3_000_000,
};

export const MEDIA_ACCEPT = "image/png,image/jpeg,image/webp";

export function isMediaKey(value: string): value is MediaKey {
  return (MEDIA_KEYS as readonly string[]).includes(value);
}

/** Batas ukuran foto racikan unggahan dashboard (sama seperti poster popup). */
export const RECIPE_PHOTO_MAX_BYTES = 3_000_000;

/**
 * Foto racikan unggahan disimpan di tabel media yang sama dengan aset
 * tampilan, dengan kunci dinamis per slug resep (`recipe-<slug>`), dan
 * dilayani lewat `/api/media/recipe-<slug>` — jadi alamat fotonya stabil
 * dan halaman publik tidak perlu dibangun ulang saat foto diganti.
 */
export function recipePhotoKey(slug: string): string {
  return `recipe-${slug}`;
}

/** Apakah kunci media ini foto racikan unggahan (`recipe-<slug>`)? */
export function isRecipePhotoKey(value: string): boolean {
  return /^recipe-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/**
 * Memastikan isi berkas benar-benar gambar dari jenis yang didukung, bukan
 * sekadar mengandalkan tipe kiriman peramban. Signature: PNG, JPEG, WEBP.
 */
export function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}

export const POPUP_ICONS = ["target", "spark", "pin", "fish"] as const;
export type PopupIcon = (typeof POPUP_ICONS)[number];

export const POPUP_ICON_LABELS: Record<PopupIcon, string> = {
  target: "Sasaran",
  spark: "Percikan / AI",
  pin: "Penanda lokasi",
  fish: "Ikan",
};

export type PopupStat = { value: string; label: string };
export type PopupFeature = { icon: PopupIcon; text: string };
export type PopupMode = "poster" | "teks";

export type PopupSettings = {
  enabled: boolean;
  mode: PopupMode;
  judul: string;
  ringkasan: string;
  statistik: PopupStat[];
  fitur: PopupFeature[];
};

export const DEFAULT_POPUP: PopupSettings = {
  enabled: true,
  mode: "poster",
  judul: "Selamat datang, pemancing!",
  ringkasan: "Katalog umpan ikan mas lengkap dengan cuaca, kondisi air, dan pengalaman komunitas.",
  statistik: [
    { value: "200", label: "racikan umpan" },
    { value: "5.000", label: "ulasan komunitas" },
    { value: "38", label: "provinsi" },
  ],
  fitur: [
    { icon: "target", text: "Cari racikan dari cuaca, kondisi air, dan budget." },
    { icon: "spark", text: "AI Umpan & Sistem Pakar bantu meracik dari bahanmu." },
    { icon: "pin", text: "Kolom provinsi terisi otomatis kalau lokasi diizinkan." },
    { icon: "fish", text: "Semua resep pakai kroto 1 ons dan amis Deho / Sunbell." },
  ],
};

/** Batas panjang teks popup: dijaga ketat karena popup tidak boleh di-scroll. */
export const POPUP_LIMITS = {
  judulMin: 3, judulMax: 70,
  ringkasanMin: 15, ringkasanMax: 200,
  statistikMin: 2, statistikMax: 3, nilaiMax: 8, labelMin: 2, labelMax: 22,
  fiturMin: 2, fiturMax: 4, fiturTextMin: 10, fiturTextMax: 90,
} as const;

function text(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return null;
  return trimmed;
}

/**
 * Memvalidasi kiriman pengaturan popup. Nilai yang tidak lolos ditolak dengan
 * pesan yang menyebut bagian bermasalahnya, bukan diabaikan diam-diam.
 */
export function validatePopupSettings(value: unknown): { data?: PopupSettings; error?: string } {
  if (!value || typeof value !== "object") return { error: "Pengaturan popup tidak valid." };
  const item = value as Record<string, unknown>;
  const L = POPUP_LIMITS;

  if (typeof item.enabled !== "boolean") return { error: "Status aktif popup tidak valid." };
  if (item.mode !== "poster" && item.mode !== "teks") return { error: "Mode popup tidak valid." };

  const judul = text(item.judul, L.judulMin, L.judulMax);
  if (!judul) return { error: `Judul popup harus ${L.judulMin}–${L.judulMax} karakter.` };
  const ringkasan = text(item.ringkasan, L.ringkasanMin, L.ringkasanMax);
  if (!ringkasan) return { error: `Ringkasan popup harus ${L.ringkasanMin}–${L.ringkasanMax} karakter.` };

  if (!Array.isArray(item.statistik) || item.statistik.length < L.statistikMin || item.statistik.length > L.statistikMax) {
    return { error: `Isi ${L.statistikMin}–${L.statistikMax} kotak statistik.` };
  }
  const statistik: PopupStat[] = [];
  for (const entry of item.statistik) {
    if (!entry || typeof entry !== "object") return { error: "Data statistik tidak valid." };
    const stat = entry as Record<string, unknown>;
    const statValue = text(stat.value, 1, L.nilaiMax);
    const statLabel = text(stat.label, L.labelMin, L.labelMax);
    if (!statValue) return { error: `Angka statistik maksimal ${L.nilaiMax} karakter.` };
    if (!statLabel) return { error: `Keterangan statistik harus ${L.labelMin}–${L.labelMax} karakter.` };
    statistik.push({ value: statValue, label: statLabel });
  }

  if (!Array.isArray(item.fitur) || item.fitur.length < L.fiturMin || item.fitur.length > L.fiturMax) {
    return { error: `Isi ${L.fiturMin}–${L.fiturMax} sorotan fitur.` };
  }
  const fitur: PopupFeature[] = [];
  for (const entry of item.fitur) {
    if (!entry || typeof entry !== "object") return { error: "Data sorotan fitur tidak valid." };
    const feature = entry as Record<string, unknown>;
    if (typeof feature.icon !== "string" || !(POPUP_ICONS as readonly string[]).includes(feature.icon)) {
      return { error: "Ikon sorotan fitur tidak dikenal." };
    }
    const featureText = text(feature.text, L.fiturTextMin, L.fiturTextMax);
    if (!featureText) return { error: `Teks sorotan fitur harus ${L.fiturTextMin}–${L.fiturTextMax} karakter.` };
    fitur.push({ icon: feature.icon as PopupIcon, text: featureText });
  }

  return { data: { enabled: item.enabled, mode: item.mode, judul, ringkasan, statistik, fitur } };
}

/**
 * Menyiapkan pengaturan tersimpan untuk ditampilkan. Berbeda dengan
 * `validatePopupSettings` yang menolak kiriman tidak lengkap, di sini nilai
 * yang tidak valid diganti bawaan **per bagian**: teks yang masih baik tidak
 * ikut hilang hanya karena bagian lain rusak (mis. baris lama yang belum punya
 * daftar statistik).
 */
export function resolvePopupSettings(stored: unknown): PopupSettings {
  const complete = validatePopupSettings(stored);
  if (complete.data) return complete.data;

  const item = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const L = POPUP_LIMITS;

  const statistik: PopupStat[] = (Array.isArray(item.statistik) ? item.statistik : [])
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const stat = entry as Record<string, unknown>;
      const value = text(stat.value, 1, L.nilaiMax);
      const label = text(stat.label, L.labelMin, L.labelMax);
      return value && label ? [{ value, label }] : [];
    })
    .slice(0, L.statistikMax);

  const fitur: PopupFeature[] = (Array.isArray(item.fitur) ? item.fitur : [])
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const feature = entry as Record<string, unknown>;
      const featureText = text(feature.text, L.fiturTextMin, L.fiturTextMax);
      const icon = typeof feature.icon === "string" && (POPUP_ICONS as readonly string[]).includes(feature.icon)
        ? (feature.icon as PopupIcon)
        : DEFAULT_POPUP.fitur[0].icon;
      return featureText ? [{ icon, text: featureText }] : [];
    })
    .slice(0, L.fiturMax);

  return {
    enabled: typeof item.enabled === "boolean" ? item.enabled : DEFAULT_POPUP.enabled,
    mode: item.mode === "teks" || item.mode === "poster" ? item.mode : DEFAULT_POPUP.mode,
    judul: text(item.judul, L.judulMin, L.judulMax) ?? DEFAULT_POPUP.judul,
    ringkasan: text(item.ringkasan, L.ringkasanMin, L.ringkasanMax) ?? DEFAULT_POPUP.ringkasan,
    statistik: statistik.length >= L.statistikMin ? statistik : DEFAULT_POPUP.statistik,
    fitur: fitur.length >= L.fiturMin ? fitur : DEFAULT_POPUP.fitur,
  };
}

export type MediaInfo = { key: MediaKey; url: string; custom: boolean; updatedAt: string | null };

export type AppearanceState = {
  logo: MediaInfo;
  /** Logo yang dipakai di footer; berkasnya terpisah dari logo navbar. */
  footerLogo: MediaInfo;
  /** Gambar latar bagian hero di beranda. */
  hero: MediaInfo;
  popup: PopupSettings & {
    media: { mobile: MediaInfo; desktop: MediaInfo; latar: MediaInfo };
  };
};

export function mediaUrl(key: MediaKey): string {
  return `/api/media/${key}`;
}

/**
 * Menggabungkan payload dari API dengan nilai bawaan. Payload yang tidak
 * lengkap (mis. dari versi lama, atau respons terpotong) tidak boleh membuat
 * komponen klien gagal render, jadi setiap bagian diperiksa satu per satu.
 */
export function mergeAppearance(value: unknown): AppearanceState {
  const base = defaultAppearance();
  if (!value || typeof value !== "object") return base;
  const item = value as { logo?: Partial<MediaInfo>; footerLogo?: Partial<MediaInfo>; hero?: Partial<MediaInfo>; popup?: (Partial<PopupSettings> & { media?: Partial<AppearanceState["popup"]["media"]> }) | null };
  const popup = resolvePopupSettings(item.popup);
  const media = item.popup?.media ?? {};
  const info = (key: MediaKey, candidate?: Partial<MediaInfo>): MediaInfo => ({
    key,
    url: typeof candidate?.url === "string" && candidate.url.startsWith("/") ? candidate.url : mediaUrl(key),
    custom: candidate?.custom === true,
    updatedAt: typeof candidate?.updatedAt === "string" ? candidate.updatedAt : null,
  });
  return {
    logo: info("logo", item.logo),
    footerLogo: info("logo-footer", item.footerLogo),
    hero: info("hero", item.hero),
    popup: {
      ...popup,
      media: {
        mobile: info("popup-mobile", media.mobile),
        desktop: info("popup-desktop", media.desktop),
        latar: info("popup-latar", media.latar),
      },
    },
  };
}

export function defaultAppearance(): AppearanceState {
  const info = (key: MediaKey): MediaInfo => ({ key, url: mediaUrl(key), custom: false, updatedAt: null });
  return {
    logo: info("logo"),
    footerLogo: info("logo-footer"),
    hero: info("hero"),
    popup: {
      ...DEFAULT_POPUP,
      media: { mobile: info("popup-mobile"), desktop: info("popup-desktop"), latar: info("popup-latar") },
    },
  };
}
