import { CORE_RECIPE_PHOTOS, buildRecipeImageAlt } from "@/data/recipe-photos";

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
 * Katalog jujur kini hanya berisi tiga racikan kurasi yang memang cocok
 * dicoba di kolam-kolam DKI Jakarta. Angka rating, jumlah ulasan, dan
 * pemancing pada data katalog sengaja dikosongkan: angka komunitas hanya
 * boleh lahir dari ulasan pengunjung yang disetujui, bukan dari katalog.
 *
 * Field yang diturunkan saat katalog dirakit: `category` (dari jenis
 * pemancingan) dan `waterBodies` (dari teks resep, lihat
 * `waterBodiesFromText`).
 */
type CoreRecipe = Omit<Recipe, "category" | "waterBodies" | "imageAlt">;

const coreRecipes: CoreRecipe[] = [
  {
    slug: "umpan-putih-kroto",
    name: "Umpan Putih Kroto",
    rating: 0,
    reviewCount: 0,
    users: 0,
    price: "Rp20.000–25.000",
    priceValue: 22500,
    difficulty: "Mudah",
    image: "/images/recipe-putih.jpg",
    weather: ["Hujan", "Mendung", "Berawan"],
    water: ["Keruh", "Hijau"],
    fishingTypes: ["Harian", "Lomba"],
    provinces: ["DKI Jakarta"],
    seasons: ["Musim Hujan", "Peralihan"],
    popularity: 0,
    summary: "Racikan lembut beraroma gurih yang jadi andalan pemancing saat hujan dan air kolam mulai keruh.",
    ingredients: [
      { name: "Pelet ikan", brand: "Pelet Jitu", amount: "50 g" },
      { name: "Susu bubuk", brand: "Dancow Full Cream", amount: "20 g" },
      { name: "Tepung terigu", brand: "Rose Brand", amount: "25 g" },
      { name: "Telur ayam", brand: "-", amount: "1 butir" },
      { name: "Santan", brand: "Kara", amount: "30 ml" },
      { name: "Kroto segar", brand: "-", amount: "15 g" },
      { name: "Essen pandan", brand: "Sesuai selera", amount: "3–5 tetes" },
    ],
    steps: ["Haluskan pelet hingga teksturnya lembut.", "Campurkan susu bubuk dan tepung sampai merata.", "Masukkan telur dan santan sedikit demi sedikit.", "Aduk hingga adonan kalis dan mudah dibentuk.", "Tambahkan kroto dan essen, aduk perlahan.", "Kukus 15–20 menit, lalu dinginkan sebelum digunakan."],
    suitable: ["Hujan", "Air keruh", "Kolam harian", "Ikan mas aktif"],
    notSuitable: ["Air sangat jernih", "Kondisi sangat panas"],
  },
  {
    slug: "vanila-telur-bebek",
    name: "Vanila Telur Bebek",
    rating: 0,
    reviewCount: 0,
    users: 0,
    price: "Rp28.000–35.000",
    priceValue: 31500,
    difficulty: "Menengah",
    image: "/images/recipes/vanila-telur-bebek.jpg",
    weather: ["Mendung", "Berawan", "Cerah"],
    water: ["Hijau", "Kekuningan"],
    fishingTypes: ["Lomba", "Galatama"],
    provinces: ["DKI Jakarta"],
    seasons: ["Musim Panas", "Peralihan"],
    popularity: 0,
    summary: "Aroma manis lembut untuk menambah variasi ketika ikan kurang responsif pada umpan gurih.",
    ingredients: [{ name: "Pelet halus", brand: "Jitu", amount: "50 g" }, { name: "Telur bebek", brand: "-", amount: "1 butir" }, { name: "Tepung ketan", brand: "Rose Brand", amount: "20 g" }, { name: "Essen vanila", brand: "-", amount: "3 tetes" }],
    steps: ["Campur pelet dan tepung ketan.", "Masukkan telur sedikit demi sedikit.", "Tambahkan essen vanila.", "Uleni hingga kenyal dan diamkan 10 menit."],
    suitable: ["Kolam lomba", "Cuaca berawan", "Air kehijauan"],
    notSuitable: ["Hujan deras", "Air sangat keruh"],
  },
  {
    slug: "roti-tawar-kroto-lomba",
    name: "Roti Tawar Kroto Lomba",
    rating: 0,
    reviewCount: 0,
    users: 0,
    price: "Rp30.000–38.000",
    priceValue: 34000,
    difficulty: "Menengah",
    image: "/images/recipes/roti-tawar-kroto-lomba.jpg",
    weather: ["Hujan", "Mendung"],
    water: ["Keruh", "Hijau"],
    fishingTypes: ["Lomba"],
    provinces: ["DKI Jakarta"],
    seasons: ["Musim Hujan"],
    popularity: 0,
    summary: "Tekstur lembut dari roti tawar dengan kroto segar untuk sesi lomba berdurasi panjang.",
    ingredients: [{ name: "Roti tawar", brand: "Sari Roti", amount: "2 lembar" }, { name: "Kroto", brand: "Segar", amount: "15 g" }, { name: "Susu bubuk", brand: "Full cream", amount: "15 g" }, { name: "Santan", brand: "Kara", amount: "15 ml" }],
    steps: ["Remas roti tawar hingga halus.", "Tambahkan susu bubuk dan santan.", "Masukkan kroto, aduk perlahan.", "Bentuk kecil dan simpan dalam wadah tertutup."],
    suitable: ["Kolam lomba", "Hujan", "Air kehijauan"],
    notSuitable: ["Kolam air bening", "Cuaca panas terik"],
  },
];

/**
 * Kroto ditakar dalam ons, bukan gram, mengikuti kebiasaan pemancing: kebanyakan
 * memakai 1 ons (≈ 100 g). Bahan amis merujuk merek tuna kaleng yang umum
 * dipakai sebagai perangsang amis, yaitu Deho atau Sunbell Katsuo.
 */
export const KROTO_AMOUNT = "1 ons";
export const AMIS_TUNA_BRAND = "Deho / Sunbell Katsuo";
export const AMIS_OIL_BRAND = "Deho / Sunbell";
export const OPTIONAL_ADDITIONS_NOTE = `${KROTO_AMOUNT} ≈ 100 g. Kroto paling pas dicampurkan saat hendak memancing, dan bahan amis umumnya memakai merek Deho atau Sunbell.`;

const KROTO_PATTERN = /kroto/i;
/** Ikan kalengan yang mungkin sudah ada, agar baris tuna amis tidak dobel. */
const CANNED_FISH_PATTERN = /sarden|tongkol|pindang|katsuo/i;

const coreKrotoIngredient: Ingredient = { name: "Kroto", brand: "Segar", amount: KROTO_AMOUNT };
const optionalKrotoIngredient: Ingredient = { ...coreKrotoIngredient, optional: true };
const amisTunaIngredient: Ingredient = { name: "Ikan tuna kaleng (amis)", brand: AMIS_TUNA_BRAND, amount: "2 sdm", optional: true };
const amisOilIngredient: Ingredient = { name: "Minyak ikan amis", brand: AMIS_OIL_BRAND, amount: "1 sdm", optional: true };

/**
 * Semua resep katalog mendapat tambahan yang sama:
 * - Kroto bertakaran ons. Resep yang memang berbasis kroto (nama atau bahannya
 *   menyebut kroto) memakai kroto sebagai bahan inti; sisanya sebagai opsi.
 * - Tuna kaleng amis (Deho / Sunbell) selama resep belum memakai ikan kalengan,
 *   plus minyaknya.
 */
function withOptionalAdditions(recipe: Omit<Recipe, "imageAlt">, fromCatalog: boolean): Omit<Recipe, "imageAlt"> {
  // Resep yang memang berbasis kroto (mis. Umpan Putih Kroto) memakai kroto
  // sebagai bahan inti; pada resep lain kroto ditandai opsional agar tidak
  // menyesatkan.
  const krotoIsCore = KROTO_PATTERN.test(recipe.name) || (fromCatalog && recipe.ingredients.some((item) => KROTO_PATTERN.test(item.name)));
  const ingredients = recipe.ingredients.map((item) => {
    if (!KROTO_PATTERN.test(item.name)) return { ...item };
    // Takaran kroto diseragamkan ke ons; merek dipertahankan bila sudah diisi.
    // Kroto warisan template pada resep non-kroto ditandai opsional.
    return {
      ...item,
      name: "Kroto",
      amount: KROTO_AMOUNT,
      brand: item.brand && item.brand !== "-" ? item.brand : "Segar",
      ...(krotoIsCore ? {} : { optional: true }),
    };
  });
  const additions: Ingredient[] = [];
  if (!ingredients.some((item) => KROTO_PATTERN.test(item.name))) additions.push(krotoIsCore ? coreKrotoIngredient : optionalKrotoIngredient);
  if (!recipe.ingredients.some((item) => CANNED_FISH_PATTERN.test(item.name))) additions.push(amisTunaIngredient);
  additions.push(amisOilIngredient);
  return { ...recipe, ingredients: [...ingredients, ...additions] };
}

/**
 * Semua resep katalog merakit `category` dari satu field yang sama dengan
 * tag kondisi, yaitu jenis pemancingan. Tidak ada lagi kategori yang
 * ditulis manual per resep maupun dipilih berdasarkan urutan kartu.
 */
export const recipes: Recipe[] = coreRecipes.map((recipe) => {
  const fishingTypes = orderFishingTypes(recipe.name, recipe.fishingTypes);
  const waterBodies = waterBodiesFromText(recipe.name, recipe.summary, recipe.suitable);
  const lengkap = withOptionalAdditions(
    {
      ...recipe,
      image: CORE_RECIPE_PHOTOS[recipe.slug] ?? recipe.image,
      fishingTypes,
      category: fishingTypes[0],
      // Label tipe air hanya dari teks resep; sisanya memakai label bawaan
      // katalog kolam (lihat DEFAULT_WATER_BODIES).
      waterBodies: waterBodies.length ? waterBodies : [...DEFAULT_WATER_BODIES],
    },
    true,
  );
  return { ...lengkap, imageAlt: buildRecipeImageAlt(lengkap) };
});

/** Cakupan Jabodetabek dihitung dari resep berlabel DKI Jakarta, Jawa Barat, dan Banten. */
export const jabodetabekProvinces = ["DKI Jakarta", "Jawa Barat", "Banten"] as const;
export const jabodetabekRecipeCount = recipes.filter((recipe) => recipe.provinces.some((province) => jabodetabekProvinces.includes(province as (typeof jabodetabekProvinces)[number]))).length;

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
