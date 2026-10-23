export type Weather = "Hujan" | "Mendung" | "Cerah" | "Berawan" | "Panas";
export type WaterCondition = "Keruh" | "Hijau" | "Jernih" | "Kekuningan";
export type FishingType = "Harian" | "Lomba" | "Galatama";

/** Pilihan jenis kolam/pemancingan yang tampil di seluruh situs. */
export const FISHING_TYPES: FishingType[] = ["Harian", "Lomba", "Galatama"];

/**
 * Daftar resmi nilai kondisi. Dipakai bersama oleh formulir dashboard,
 * validasi server (CMS), dan saringan publik, supaya tidak ada lagi nilai
 * hasil ketikan bebas yang ditolak server atau tak pernah cocok dengan
 * saringan mana pun.
 */
export const WEATHER_CONDITIONS: Weather[] = ["Hujan", "Mendung", "Cerah", "Berawan", "Panas"];
export const WATER_CONDITIONS: WaterCondition[] = ["Keruh", "Hijau", "Jernih", "Kekuningan"];
export const SEASON_CONDITIONS: string[] = ["Musim Hujan", "Musim Panas", "Kemarau", "Peralihan"];

/**
 * Sebutan lama untuk kolam galatama yang sempat terlanjur dipakai di situs
 * (dan tersimpan di basis data). Tetap dibaca sebagai "Galatama" agar resep
 * dan ulasan lama tidak hilang saat penyebutannya diperbaiki.
 */
const LEGACY_FISHING_TYPE = "Galat";

/** Menyeragamkan sebutan: "Galat" lama dibaca sebagai "Galatama". */
export function normalizeFishingType(value: string): string {
  return value === LEGACY_FISHING_TYPE ? "Galatama" : value;
}

/** Sama seperti di atas, untuk daftar jenis (mis. `fishingTypes` sebuah resep). */
export function normalizeFishingTypes(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => normalizeFishingType(value.trim())).filter(Boolean))];
}

/** Apakah nilai ini salah satu jenis yang dikenal (termasuk sebutan lama)? */
export function isFishingType(value: string): boolean {
  return (FISHING_TYPES as string[]).includes(normalizeFishingType(value.trim()));
}

/**
 * Jenis pemancingan yang tertulis di nama resep, mis. "Sarden Pelet Lomba" →
 * "Lomba". Dipakai supaya nama, badge, dan tag kondisi tidak saling bertentangan.
 */
export function fishingTypeFromName(name: string): FishingType | null {
  return FISHING_TYPES.find((type) => new RegExp(`\\b${type}\\b`, "i").test(name)) ?? null;
}

/**
 * Jenis pemancingan utama sebuah resep: **satu-satunya sumber** badge dan tag
 * kondisi. Kalau nama resep menyebut jenisnya, itu yang dipakai; kalau tidak,
 * jenis pertama dari data kondisi resep (warisan template katalog).
 */
export function primaryFishingType(name: string, fishingTypes: readonly string[]): FishingType {
  const dariNama = fishingTypeFromName(name);
  if (dariNama) return dariNama;
  const [pertama] = normalizeFishingTypes(fishingTypes);
  return (FISHING_TYPES as string[]).includes(pertama) ? (pertama as FishingType) : "Harian";
}

/**
 * Daftar jenis dengan jenis utama di depan. Tag pertama di kartu selalu sama
 * dengan badge, dan jenis lain tetap ditampilkan agar tidak ada kondisi yang
 * disembunyikan.
 */
export function orderFishingTypes(name: string, fishingTypes: readonly string[]): FishingType[] {
  const utama = primaryFishingType(name, fishingTypes);
  const lain = normalizeFishingTypes(fishingTypes).filter(
    (type) => type !== utama && (FISHING_TYPES as string[]).includes(type),
  ) as FishingType[];
  return [utama, ...lain];
}

/**
 * Menyeragamkan sebutan di dalam kalimat, mis. "Kolam galatama" -> "Kolam
 * galatama" dan "Kolam Galat" -> "Kolam Galatama". Hanya dipakai pada teks
 * data resep/ulasan, bukan pada pesan galat (arti "error") di antarmuka.
 */
export function normalizeFishingText(value: string): string {
  return value.replace(/\bgalat\b/gi, (match) => (match === "Galat" ? "Galatama" : "galatama"));
}
/**
 * Tipe air tempat resep dipakai: kolam, sungai, atau danau. Ini **beda** dari
 * kondisi air (keruh/hijau/jernih/kekuningan) — kondisi air berubah dari hari
 * ke hari, sedangkan tipe air adalah jenis perairannya.
 *
 * Dipakai sebagai salah satu pertimbangan skor kecocokan (lihat
 * `@/lib/recommendation-config`), karena karakter air tiap perairan berbeda:
 * provinsi yang sama tidak menjamin kolam yang sama.
 */
export type WaterBody = "Kolam" | "Sungai" | "Danau";

export const WATER_BODIES: WaterBody[] = ["Kolam", "Sungai", "Danau"];

export function isWaterBody(value: string): value is WaterBody {
  return (WATER_BODIES as string[]).includes(value);
}

/**
 * Tipe air hanya ditulis kalau teks resepnya memang menyebutkannya. Fungsi ini
 * sengaja tidak menebak: resep yang tidak menyebut sungai/danau tidak diberi
 * label itu. Teks `notSuitable` tidak ikut dibaca karena isinya justru kondisi
 * yang **tidak** cocok.
 */
export function waterBodiesFromText(...texts: (string | readonly string[] | undefined)[]): WaterBody[] {
  const gabungan = texts
    .flatMap((text) => (Array.isArray(text) ? text : [text]))
    .filter((text): text is string => typeof text === "string")
    .join(" ")
    .toLocaleLowerCase("id-ID");
  return WATER_BODIES.filter((body) => new RegExp(`\\b${body.toLowerCase()}\\b`).test(gabungan));
}

/**
 * Katalog ini disusun untuk pemancingan kolam (harian, lomba, galatama), dan
 * setiap entri "cocok untuk" pada resep inti menyebut kolam. Jadi resep yang
 * teksnya tidak menyebut tipe air mana pun memakai label bawaan ini, bukan
 * tebakan sungai/danau. Editor bisa mengubahnya dari dashboard kalau memang ada
 * resep khusus sungai atau danau.
 */
export const DEFAULT_WATER_BODIES: WaterBody[] = ["Kolam"];

/**
 * Kategori resep = jenis pemancingan resep itu. Nilainya **diturunkan** dari
 * `fishingTypes` (lihat `primaryFishingType`), bukan ditulis manual per resep,
 * supaya badge di kartu dan tag kondisi tidak pernah bertentangan.
 */
export type RecipeCategory = FishingType;

export type Ingredient = {
  name: string;
  brand: string;
  amount: string;
  /**
   * Bahan tambahan yang boleh dilewati. Tersedia di semua resep, sehingga tidak
   * dipakai sebagai pembeda pada pencarian maupun skor kecocokan bahan.
   */
  optional?: boolean;
};

export type Recipe = {
  slug: string;
  name: string;
  category: RecipeCategory;
  rating: number;
  reviewCount: number;
  users: number;
  price: string;
  priceValue: number;
  difficulty: "Mudah" | "Menengah" | "Tingkat lanjut";
  image: string;
  /** Seluruh foto galeri terurut; `image` adalah thumbnail pilihannya. */
  images: string[];
  /** Alt text unik per resep, diturunkan dari nama, warna adonan, dan bahan inti. */
  imageAlt: string;
  weather: Weather[];
  water: WaterCondition[];
  /** Tipe perairan (kolam/sungai/danau) — lihat `waterBodiesFromText`. */
  waterBodies: WaterBody[];
  fishingTypes: FishingType[];
  provinces: string[];
  seasons: string[];
  popularity: number;
  summary: string;
  ingredients: Ingredient[];
  steps: string[];
  suitable: string[];
  notSuitable: string[];
};

/**
 * Kroto ditakar dalam ons, bukan gram, mengikuti kebiasaan pemancing: kebanyakan
 * memakai 1 ons (≈ 100 g). Bahan amis merujuk merek tuna kaleng yang umum
 * dipakai sebagai perangsang amis, yaitu Deho atau Sunbell Katsuo.
 */
export const KROTO_AMOUNT = "1 ons";
export const AMIS_TUNA_BRAND = "Deho / Sunbell Katsuo";
export const AMIS_OIL_BRAND = "Deho / Sunbell";
export const OPTIONAL_ADDITIONS_NOTE = `${KROTO_AMOUNT} ≈ 100 g. Kroto paling pas dicampurkan saat hendak memancing, dan bahan amis umumnya memakai merek Deho atau Sunbell.`;

/** Cakupan Jabodetabek dihitung dari resep berlabel DKI Jakarta, Jawa Barat, dan Banten. */
export const jabodetabekProvinces = ["DKI Jakarta", "Jawa Barat", "Banten"] as const;

export const defaultPreferences = {
  province: "DKI Jakarta",
  weather: "Hujan" as Weather,
  water: "Keruh" as WaterCondition,
  // Sengaja kosong: tipe air tidak boleh diisi diam-diam, karena pengunjung
  // yang belum memilih tipe air tidak sedang mengklaim apa pun.
  waterBody: "",
  fishingType: "Harian" as FishingType,
  budget: "Rp15.000–30.000",
  season: "Musim Hujan",
};
