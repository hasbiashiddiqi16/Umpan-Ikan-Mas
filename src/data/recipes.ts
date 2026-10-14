import { provinceDirectory } from "@/data/province-directory";

export type Weather = "Hujan" | "Mendung" | "Cerah" | "Berawan" | "Panas";
export type WaterCondition = "Keruh" | "Hijau" | "Jernih" | "Kekuningan";
export type FishingType = "Harian" | "Lomba" | "Galatama";

/** Pilihan jenis kolam/pemancingan yang tampil di seluruh situs. */
export const FISHING_TYPES: FishingType[] = ["Harian", "Lomba", "Galatama"];

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
  weather: Weather[];
  water: WaterCondition[];
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

type CoreRecipe = Omit<Recipe, "category">;

const coreRecipes: CoreRecipe[] = [
  {
    slug: "umpan-putih-kroto",
    name: "Umpan Putih Kroto",
    rating: 4.8,
    reviewCount: 327,
    users: 2341,
    price: "Rp20.000–25.000",
    priceValue: 22500,
    difficulty: "Mudah",
    image: "/images/recipe-putih.jpg",
    weather: ["Hujan", "Mendung", "Berawan"],
    water: ["Keruh", "Hijau"],
    fishingTypes: ["Harian", "Lomba"],
    provinces: ["Jawa Barat", "Banten", "DKI Jakarta", "Jawa Tengah"],
    seasons: ["Musim Hujan", "Peralihan"],
    popularity: 98,
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
    slug: "pelet-pandan-wangi",
    name: "Pelet Pandan Wangi",
    rating: 4.7,
    reviewCount: 214,
    users: 1892,
    price: "Rp12.000–18.000",
    priceValue: 15000,
    difficulty: "Mudah",
    image: "/images/recipe-pelet.jpg",
    weather: ["Cerah", "Berawan", "Panas"],
    water: ["Hijau", "Jernih"],
    fishingTypes: ["Harian", "Galatama"],
    provinces: ["Jawa Tengah", "Jawa Timur", "DI Yogyakarta", "Jawa Barat"],
    seasons: ["Musim Panas", "Kemarau"],
    popularity: 94,
    summary: "Pandan ringan berpadu dengan pelet yang mudah ditemukan, pas untuk sesi santai dengan budget bersahabat.",
    ingredients: [{ name: "Pelet ikan", brand: "Pelet 781", amount: "60 g" }, { name: "Tepung beras", brand: "Rose Brand", amount: "20 g" }, { name: "Air pandan", brand: "Segar", amount: "30 ml" }, { name: "Essen pandan", brand: "-", amount: "2–3 tetes" }],
    steps: ["Rendam pelet sebentar hingga lunak.", "Tambahkan tepung beras dan aduk rata.", "Tuangkan air pandan sedikit demi sedikit.", "Uleni hingga pulen dan simpan dalam wadah tertutup."],
    suitable: ["Cuaca cerah", "Air hijau", "Kolam harian", "Budget ekonomis"],
    notSuitable: ["Hujan deras", "Air sangat keruh"],
  },
  {
    slug: "jagung-kroto-kuning",
    name: "Jagung Kroto Kuning",
    rating: 4.8,
    reviewCount: 186,
    users: 1548,
    price: "Rp18.000–24.000",
    priceValue: 21000,
    difficulty: "Mudah",
    image: "/images/recipe-jagung.jpg",
    weather: ["Mendung", "Cerah", "Berawan"],
    water: ["Kekuningan", "Keruh"],
    fishingTypes: ["Harian", "Lomba"],
    provinces: ["Jawa Timur", "Bali", "Lampung", "Jawa Tengah"],
    seasons: ["Musim Hujan", "Musim Panas"],
    popularity: 91,
    summary: "Aroma jagung manis dan kroto memberi karakter yang kuat saat ikan mas sedang aktif mencari makan.",
    ingredients: [{ name: "Jagung manis", brand: "Pipil segar", amount: "50 g" }, { name: "Pelet ikan", brand: "Pelet Jitu", amount: "40 g" }, { name: "Kroto", brand: "-", amount: "10 g" }, { name: "Susu bubuk", brand: "Dancow", amount: "15 g" }],
    steps: ["Haluskan jagung manis hingga lembut.", "Campur pelet dan susu bubuk.", "Satukan semua bahan, tambahkan air secukupnya.", "Masukkan kroto terakhir dan aduk perlahan."],
    suitable: ["Air kekuningan", "Ikan aktif", "Cuaca mendung", "Kolam harian"],
    notSuitable: ["Air sangat jernih", "Cuaca terik"],
  },
  {
    slug: "keju-susu-kukus",
    name: "Keju Susu Kukus",
    rating: 4.9,
    reviewCount: 142,
    users: 1120,
    price: "Rp35.000–45.000",
    priceValue: 40000,
    difficulty: "Menengah",
    image: "/images/recipe-putih.jpg",
    weather: ["Hujan", "Mendung"],
    water: ["Keruh", "Kekuningan"],
    fishingTypes: ["Lomba", "Harian"],
    provinces: ["Jawa Barat", "Jawa Timur", "Banten"],
    seasons: ["Musim Hujan", "Peralihan"],
    popularity: 83,
    summary: "Perpaduan aroma gurih yang lebih intens untuk kolam padat pemancing dan sesi lomba.",
    ingredients: [{ name: "Pelet premium", brand: "Sakura", amount: "50 g" }, { name: "Keju cheddar", brand: "Kraft", amount: "20 g" }, { name: "Susu bubuk", brand: "Full cream", amount: "15 g" }, { name: "Telur bebek", brand: "-", amount: "1 butir" }],
    steps: ["Parut keju hingga halus.", "Campurkan pelet dan susu bubuk.", "Masukkan telur, aduk sampai rata.", "Tambahkan keju, lalu kukus selama 20 menit."],
    suitable: ["Air keruh", "Kolam lomba", "Hujan ringan", "Ikan mencari aroma gurih"],
    notSuitable: ["Kolam sangat jernih", "Budget terbatas"],
  },
  {
    slug: "vanila-telur-bebek",
    name: "Vanila Telur Bebek",
    rating: 4.6,
    reviewCount: 118,
    users: 987,
    price: "Rp28.000–35.000",
    priceValue: 31500,
    difficulty: "Menengah",
    image: "/images/recipe-jagung.jpg",
    weather: ["Mendung", "Berawan", "Cerah"],
    water: ["Hijau", "Kekuningan"],
    fishingTypes: ["Lomba", "Galatama"],
    provinces: ["Banten", "DKI Jakarta", "Jawa Barat"],
    seasons: ["Musim Panas", "Peralihan"],
    popularity: 80,
    summary: "Aroma manis lembut untuk menambah variasi ketika ikan kurang responsif pada umpan gurih.",
    ingredients: [{ name: "Pelet halus", brand: "Jitu", amount: "50 g" }, { name: "Telur bebek", brand: "-", amount: "1 butir" }, { name: "Tepung ketan", brand: "Rose Brand", amount: "20 g" }, { name: "Essen vanila", brand: "-", amount: "3 tetes" }],
    steps: ["Campur pelet dan tepung ketan.", "Masukkan telur sedikit demi sedikit.", "Tambahkan essen vanila.", "Uleni hingga kenyal dan diamkan 10 menit."],
    suitable: ["Kolam lomba", "Cuaca berawan", "Air kehijauan"],
    notSuitable: ["Hujan deras", "Air sangat keruh"],
  },
  {
    slug: "kacang-santan-gurih",
    name: "Kacang Santan Gurih",
    rating: 4.5,
    reviewCount: 96,
    users: 804,
    price: "Rp16.000–22.000",
    priceValue: 19000,
    difficulty: "Mudah",
    image: "/images/recipe-pelet.jpg",
    weather: ["Hujan", "Mendung"],
    water: ["Keruh", "Hijau"],
    fishingTypes: ["Harian", "Galatama"],
    provinces: ["Riau", "Sumatera Selatan", "Jawa Barat"],
    seasons: ["Musim Hujan"],
    popularity: 76,
    summary: "Racikan hemat dengan aroma gurih santan, mudah dibuat dari bahan dapur sehari-hari.",
    ingredients: [{ name: "Kacang tanah", brand: "Sangrai", amount: "20 g" }, { name: "Pelet", brand: "781", amount: "50 g" }, { name: "Santan", brand: "Kara", amount: "25 ml" }, { name: "Tepung tapioka", brand: "Rose Brand", amount: "15 g" }],
    steps: ["Sangrai dan haluskan kacang tanah.", "Campurkan dengan pelet dan tapioka.", "Tambahkan santan hingga kalis.", "Bentuk adonan kecil sesuai mata kail."],
    suitable: ["Hujan", "Air keruh", "Kolam harian", "Budget terjangkau"],
    notSuitable: ["Cuaca panas terik", "Air sangat jernih"],
  },
  {
    slug: "amis-udang-bawang",
    name: "Amis Udang Bawang",
    rating: 4.6,
    reviewCount: 77,
    users: 721,
    price: "Rp24.000–30.000",
    priceValue: 27000,
    difficulty: "Menengah",
    image: "/images/recipe-putih.jpg",
    weather: ["Hujan", "Berawan"],
    water: ["Keruh", "Kekuningan"],
    fishingTypes: ["Galatama", "Lomba"],
    provinces: ["Jawa Timur", "Sumatera Utara", "Kalimantan Selatan"],
    seasons: ["Musim Hujan", "Peralihan"],
    popularity: 71,
    summary: "Karakter amis udang dengan sentuhan bawang, sering dipilih untuk kolam yang ramai.",
    ingredients: [{ name: "Pelet udang", brand: "Sakura", amount: "50 g" }, { name: "Udang rebon", brand: "Kering", amount: "10 g" }, { name: "Bawang putih", brand: "Segar", amount: "1 siung" }, { name: "Tepung roti", brand: "-", amount: "20 g" }],
    steps: ["Haluskan bawang putih dan udang rebon.", "Campur dengan pelet udang.", "Tambahkan tepung roti dan air hangat.", "Uleni sampai tidak lengket."],
    suitable: ["Kolam galatama", "Air keruh", "Ikan aktif makan"],
    notSuitable: ["Air sangat jernih", "Kolam alami"],
  },
  {
    slug: "roti-keju-ekonomis",
    name: "Roti Keju Ekonomis",
    rating: 4.4,
    reviewCount: 64,
    users: 632,
    price: "Rp10.000–15.000",
    priceValue: 12500,
    difficulty: "Mudah",
    image: "/images/recipe-jagung.jpg",
    weather: ["Cerah", "Berawan"],
    water: ["Jernih", "Hijau"],
    fishingTypes: ["Harian"],
    provinces: ["DI Yogyakarta", "Jawa Tengah", "Lampung"],
    seasons: ["Musim Panas", "Kemarau"],
    popularity: 68,
    summary: "Pilihan praktis dengan bahan sederhana untuk sesi harian yang tidak membutuhkan banyak persiapan.",
    ingredients: [{ name: "Roti tawar", brand: "Sari Roti", amount: "2 lembar" }, { name: "Keju lembar", brand: "Cheddar", amount: "1 lembar" }, { name: "Susu kental", brand: "Indomilk", amount: "1 sdm" }],
    steps: ["Buang pinggiran roti dan remas halus.", "Tambahkan keju parut dan susu.", "Aduk hingga menjadi adonan yang mudah dipulung."],
    suitable: ["Kolam harian", "Air jernih", "Persiapan singkat"],
    notSuitable: ["Hujan deras", "Air sangat keruh"],
  },
  {
    slug: "pelet-tuna-kroto",
    name: "Pelet Tuna Kroto",
    rating: 4.9,
    reviewCount: 93,
    users: 790,
    price: "Rp42.000–55.000",
    priceValue: 48500,
    difficulty: "Tingkat lanjut",
    image: "/images/recipe-pelet.jpg",
    weather: ["Hujan", "Mendung"],
    water: ["Keruh", "Hijau"],
    fishingTypes: ["Lomba", "Galatama"],
    provinces: ["Jawa Barat", "Jawa Timur", "Banten"],
    seasons: ["Musim Hujan"],
    popularity: 73,
    summary: "Racikan beraroma kuat untuk pemancing yang ingin mencoba komposisi premium di kolam lomba.",
    ingredients: [{ name: "Pelet tuna", brand: "Premium Mix", amount: "60 g" }, { name: "Kroto", brand: "Segar", amount: "15 g" }, { name: "Susu bubuk", brand: "Full cream", amount: "10 g" }, { name: "Essen tuna", brand: "-", amount: "3 tetes" }],
    steps: ["Rendam pelet dengan sedikit air hangat.", "Masukkan susu dan essen tuna.", "Tambahkan kroto terakhir.", "Diamkan 5 menit sebelum dipakai."],
    suitable: ["Lomba", "Hujan", "Air keruh"],
    notSuitable: ["Budget ekonomis", "Air sangat jernih"],
  },
  {
    slug: "ubi-madu-kukus",
    name: "Ubi Madu Kukus",
    rating: 4.5,
    reviewCount: 59,
    users: 540,
    price: "Rp14.000–20.000",
    priceValue: 17000,
    difficulty: "Mudah",
    image: "/images/recipe-jagung.jpg",
    weather: ["Cerah", "Panas", "Berawan"],
    water: ["Jernih", "Kekuningan"],
    fishingTypes: ["Harian", "Galatama"],
    provinces: ["Jawa Tengah", "Jawa Timur", "Bali"],
    seasons: ["Musim Panas", "Kemarau"],
    popularity: 63,
    summary: "Ubi manis yang lembut memberi aroma natural untuk kolam yang airnya relatif bening.",
    ingredients: [{ name: "Ubi madu", brand: "Lokal", amount: "100 g" }, { name: "Tepung tapioka", brand: "-", amount: "15 g" }, { name: "Madu", brand: "Murni", amount: "1 sdt" }],
    steps: ["Kukus ubi sampai benar-benar lunak.", "Haluskan selagi hangat.", "Campur tapioka dan madu sedikit demi sedikit.", "Bentuk adonan sesuai kebutuhan."],
    suitable: ["Air jernih", "Cuaca cerah", "Kolam harian"],
    notSuitable: ["Hujan lebat", "Air keruh pekat"],
  },
  {
    slug: "sagu-telur-madu",
    name: "Sagu Telur Madu",
    rating: 4.6,
    reviewCount: 51,
    users: 480,
    price: "Rp22.000–29.000",
    priceValue: 25500,
    difficulty: "Menengah",
    image: "/images/recipe-putih.jpg",
    weather: ["Mendung", "Cerah"],
    water: ["Jernih", "Hijau"],
    fishingTypes: ["Lomba", "Harian"],
    provinces: ["Banten", "Jawa Barat", "Sumatera Selatan"],
    seasons: ["Peralihan", "Musim Panas"],
    popularity: 59,
    summary: "Tekstur kenyal dan aroma madu ringan, cocok untuk pendekatan yang lebih halus.",
    ingredients: [{ name: "Tepung sagu", brand: "Lokal", amount: "40 g" }, { name: "Telur ayam", brand: "-", amount: "1 butir" }, { name: "Madu", brand: "Murni", amount: "1 sdt" }, { name: "Pelet", brand: "Halus", amount: "30 g" }],
    steps: ["Campurkan sagu dengan pelet halus.", "Masukkan telur dan madu.", "Uleni perlahan hingga kenyal.", "Kukus sebentar bila menginginkan tekstur lebih padat."],
    suitable: ["Air jernih", "Kolam lomba", "Cuaca teduh"],
    notSuitable: ["Air keruh pekat", "Hujan deras"],
  },
  {
    slug: "kelapa-pandan-hijau",
    name: "Kelapa Pandan Hijau",
    rating: 4.3,
    reviewCount: 42,
    users: 390,
    price: "Rp13.000–19.000",
    priceValue: 16000,
    difficulty: "Mudah",
    image: "/images/recipe-pelet.jpg",
    weather: ["Cerah", "Berawan", "Panas"],
    water: ["Hijau", "Kekuningan"],
    fishingTypes: ["Harian", "Galatama"],
    provinces: ["Riau", "Jambi", "Kalimantan Barat"],
    seasons: ["Musim Panas", "Kemarau"],
    popularity: 54,
    summary: "Kelapa dan pandan membentuk aroma ringan yang mudah diracik di rumah.",
    ingredients: [{ name: "Kelapa parut", brand: "Muda", amount: "30 g" }, { name: "Pelet", brand: "Lokal", amount: "50 g" }, { name: "Air pandan", brand: "Segar", amount: "20 ml" }],
    steps: ["Sangrai kelapa parut hingga harum.", "Haluskan pelet dan campur bersama kelapa.", "Tambahkan air pandan sampai tekstur sesuai."],
    suitable: ["Air kehijauan", "Cuaca cerah", "Kolam harian"],
    notSuitable: ["Air sangat keruh", "Hujan lebat"],
  },
  {
    slug: "susu-kedelai-kroto",
    name: "Susu Kedelai Kroto",
    rating: 4.7,
    reviewCount: 37,
    users: 354,
    price: "Rp19.000–26.000",
    priceValue: 22500,
    difficulty: "Menengah",
    image: "/images/recipe-putih.jpg",
    weather: ["Hujan", "Mendung", "Berawan"],
    water: ["Keruh", "Kekuningan"],
    fishingTypes: ["Harian", "Lomba"],
    provinces: ["Sumatera Utara", "Jawa Barat", "Kalimantan Selatan"],
    seasons: ["Musim Hujan", "Peralihan"],
    popularity: 57,
    summary: "Susu kedelai yang creamy dipadukan dengan kroto untuk racikan beraroma gurih.",
    ingredients: [{ name: "Pelet ikan", brand: "Jitu", amount: "50 g" }, { name: "Susu kedelai", brand: "Tanpa gula", amount: "25 ml" }, { name: "Kroto", brand: "Segar", amount: "10 g" }, { name: "Tepung roti", brand: "-", amount: "15 g" }],
    steps: ["Rendam pelet dengan susu kedelai.", "Aduk dengan tepung roti hingga menyatu.", "Masukkan kroto perlahan.", "Diamkan dalam wadah tertutup selama 10 menit."],
    suitable: ["Hujan", "Air keruh", "Kolam harian"],
    notSuitable: ["Cuaca sangat panas", "Air bening sekali"],
  },
  {
    slug: "kuning-santan-pisang",
    name: "Kuning Santan Pisang",
    rating: 4.2,
    reviewCount: 33,
    users: 310,
    price: "Rp11.000–16.000",
    priceValue: 13500,
    difficulty: "Mudah",
    image: "/images/recipe-jagung.jpg",
    weather: ["Cerah", "Berawan"],
    water: ["Kekuningan", "Hijau"],
    fishingTypes: ["Harian"],
    provinces: ["Lampung", "Bali", "Nusa Tenggara Barat"],
    seasons: ["Musim Panas"],
    popularity: 47,
    summary: "Pisang matang dan santan untuk aroma manis gurih yang hemat dan sederhana.",
    ingredients: [{ name: "Pisang kepok", brand: "Matang", amount: "1 buah" }, { name: "Santan", brand: "Kara", amount: "15 ml" }, { name: "Tepung roti", brand: "-", amount: "30 g" }],
    steps: ["Lumatkan pisang sampai halus.", "Campur santan dan tepung roti.", "Aduk hingga adonan padat dan mudah dipulung."],
    suitable: ["Air kekuningan", "Cuaca cerah", "Kolam harian"],
    notSuitable: ["Hujan deras", "Air sangat keruh"],
  },
  {
    slug: "essen-mangga-pelet",
    name: "Essen Mangga Pelet",
    rating: 4.4,
    reviewCount: 28,
    users: 275,
    price: "Rp25.000–32.000",
    priceValue: 28500,
    difficulty: "Mudah",
    image: "/images/recipe-pelet.jpg",
    weather: ["Cerah", "Panas", "Berawan"],
    water: ["Hijau", "Jernih"],
    fishingTypes: ["Galatama", "Harian"],
    provinces: ["Kalimantan Timur", "Sulawesi Selatan", "Jawa Tengah"],
    seasons: ["Musim Panas", "Kemarau"],
    popularity: 43,
    summary: "Sentuhan buah tropis yang ringan untuk menciptakan variasi aroma pelet.",
    ingredients: [{ name: "Pelet halus", brand: "781", amount: "60 g" }, { name: "Tepung tapioka", brand: "-", amount: "15 g" }, { name: "Essen mangga", brand: "-", amount: "2 tetes" }],
    steps: ["Lunakkan pelet dengan air hangat.", "Tambahkan tepung tapioka.", "Teteskan essen sedikit demi sedikit dan aduk rata."],
    suitable: ["Cuaca cerah", "Air hijau", "Kolam galatama"],
    notSuitable: ["Air keruh pekat", "Hujan lebat"],
  },
  {
    slug: "roti-tawar-kroto-lomba",
    name: "Roti Tawar Kroto Lomba",
    rating: 4.8,
    reviewCount: 45,
    users: 420,
    price: "Rp30.000–38.000",
    priceValue: 34000,
    difficulty: "Menengah",
    image: "/images/recipe-putih.jpg",
    weather: ["Hujan", "Mendung"],
    water: ["Keruh", "Hijau"],
    fishingTypes: ["Lomba"],
    provinces: ["Jawa Barat", "DKI Jakarta", "Banten"],
    seasons: ["Musim Hujan"],
    popularity: 67,
    summary: "Tekstur lembut dari roti tawar dengan kroto segar untuk sesi lomba berdurasi panjang.",
    ingredients: [{ name: "Roti tawar", brand: "Sari Roti", amount: "2 lembar" }, { name: "Kroto", brand: "Segar", amount: "15 g" }, { name: "Susu bubuk", brand: "Full cream", amount: "15 g" }, { name: "Santan", brand: "Kara", amount: "15 ml" }],
    steps: ["Remas roti tawar hingga halus.", "Tambahkan susu bubuk dan santan.", "Masukkan kroto, aduk perlahan.", "Bentuk kecil dan simpan dalam wadah tertutup."],
    suitable: ["Kolam lomba", "Hujan", "Air kehijauan"],
    notSuitable: ["Kolam air bening", "Cuaca panas terik"],
  },
  {
    slug: "pelet-ikan-bawang-putih",
    name: "Pelet Bawang Putih",
    rating: 4.3,
    reviewCount: 21,
    users: 231,
    price: "Rp9.000–14.000",
    priceValue: 11500,
    difficulty: "Mudah",
    image: "/images/recipe-pelet.jpg",
    weather: ["Hujan", "Mendung"],
    water: ["Keruh", "Kekuningan"],
    fishingTypes: ["Harian", "Galatama"],
    provinces: ["Jawa Timur", "Sumatera Selatan", "Sulawesi Selatan"],
    seasons: ["Musim Hujan"],
    popularity: 42,
    summary: "Racikan ekonomis dengan sedikit bawang putih sebagai aksen aroma gurih.",
    ingredients: [{ name: "Pelet", brand: "Lokal", amount: "60 g" }, { name: "Bawang putih", brand: "Segar", amount: "½ siung" }, { name: "Tepung tapioka", brand: "-", amount: "20 g" }],
    steps: ["Haluskan bawang putih.", "Campurkan dengan pelet yang sudah dilunakkan.", "Tambahkan tapioka dan uleni rata."],
    suitable: ["Budget ekonomis", "Air keruh", "Kolam harian"],
    notSuitable: ["Air jernih sekali", "Cuaca panas"],
  },
  {
    slug: "sarden-susu-premium",
    name: "Sarden Susu Premium",
    rating: 4.7,
    reviewCount: 18,
    users: 199,
    price: "Rp48.000–60.000",
    priceValue: 54000,
    difficulty: "Tingkat lanjut",
    image: "/images/recipe-putih.jpg",
    weather: ["Hujan", "Berawan"],
    water: ["Keruh", "Hijau"],
    fishingTypes: ["Lomba", "Galatama"],
    provinces: ["Jawa Barat", "Kalimantan Timur", "Sumatera Utara"],
    seasons: ["Musim Hujan", "Peralihan"],
    popularity: 39,
    summary: "Komposisi intens untuk pemancing berpengalaman yang ingin bereksperimen di kolam lomba.",
    ingredients: [{ name: "Pelet premium", brand: "Competition", amount: "50 g" }, { name: "Sarden", brand: "Kaleng", amount: "10 g" }, { name: "Susu bubuk", brand: "Full cream", amount: "15 g" }, { name: "Kroto", brand: "Segar", amount: "10 g" }],
    steps: ["Tiriskan dan haluskan sedikit daging sarden.", "Campur dengan pelet dan susu bubuk.", "Tambahkan kroto saat adonan sudah rata.", "Uleni singkat dan simpan dingin."],
    suitable: ["Kolam lomba", "Hujan", "Air hijau"],
    notSuitable: ["Budget terbatas", "Pemula tanpa pengalaman meracik"],
  },
  {
    slug: "jagung-keju-kolam",
    name: "Jagung Keju Kolam",
    rating: 4.5,
    reviewCount: 17,
    users: 170,
    price: "Rp21.000–28.000",
    priceValue: 24500,
    difficulty: "Mudah",
    image: "/images/recipe-jagung.jpg",
    weather: ["Cerah", "Berawan"],
    water: ["Kekuningan", "Hijau"],
    fishingTypes: ["Harian", "Galatama"],
    provinces: ["Bali", "Jawa Timur", "Nusa Tenggara Barat"],
    seasons: ["Musim Panas", "Peralihan"],
    popularity: 36,
    summary: "Jagung dan keju memberi perpaduan manis gurih untuk kondisi air kolam yang mulai hangat.",
    ingredients: [{ name: "Jagung manis", brand: "Pipil", amount: "50 g" }, { name: "Keju cheddar", brand: "-", amount: "10 g" }, { name: "Pelet", brand: "Jitu", amount: "40 g" }],
    steps: ["Haluskan jagung dan keju bersama.", "Campur dengan pelet halus.", "Tambahkan air hangat hingga mudah dibentuk."],
    suitable: ["Cuaca cerah", "Air kekuningan", "Kolam harian"],
    notSuitable: ["Hujan deras", "Air keruh pekat"],
  },
  {
    slug: "amis-kuning-telur",
    name: "Amis Kuning Telur",
    rating: 4.4,
    reviewCount: 14,
    users: 148,
    price: "Rp17.000–23.000",
    priceValue: 20000,
    difficulty: "Menengah",
    image: "/images/recipe-jagung.jpg",
    weather: ["Hujan", "Mendung"],
    water: ["Keruh", "Kekuningan"],
    fishingTypes: ["Galatama", "Harian"],
    provinces: ["Kalimantan Selatan", "Jawa Tengah", "Riau"],
    seasons: ["Musim Hujan"],
    popularity: 34,
    summary: "Kuning telur menambah aroma gurih yang akrab digunakan untuk racikan kolam galatama.",
    ingredients: [{ name: "Pelet ikan", brand: "Lokal", amount: "50 g" }, { name: "Kuning telur", brand: "Ayam", amount: "1 butir" }, { name: "Tepung roti", brand: "-", amount: "20 g" }],
    steps: ["Pisahkan kuning telur.", "Campur dengan pelet dan tepung roti.", "Uleni hingga adonan kalis.", "Diamkan sebentar sebelum dipakai."],
    suitable: ["Kolam galatama", "Air keruh", "Cuaca mendung"],
    notSuitable: ["Air bening", "Cuaca sangat panas"],
  },
];

const curatedAdditionalRecipeNames = [
  "Pelet Pisang Ambon", "Roti Pandan Susu", "Ubi Madu Kroto", "Tahu Putih Keju", "Sarden Pelet Lomba",
  "Singkong Kelapa Gurih", "Jagung Susu Manis", "Tempe Pandan Halus", "Kacang Hijau Santan", "Pelet Belut Galatama",
  "Telur Asin Keju", "Roti Tawar Pandan", "Ubi Ungu Susu", "Biskuit Keju Kroto", "Pelet Udang Rebon",
  "Jagung Nangka Harian", "Tahu Sutra Vanila", "Susu Jagung Lembut", "Kelapa Madu Kuning", "Pelet Cokelat Santan",
  "Roti Sari Pandan", "Pisang Keju Kolam", "Ubi Talas Gurih", "Kacang Merah Susu", "Pelet Durian Lomba",
  "Sarden Telur Bebek", "Jagung Tahu Putih", "Tepung Beras Kroto", "Roti Kukus Vanila", "Singkong Keju Manis",
  "Pelet Pandan Galatama", "Ubi Madu Kelapa", "Tahu Susu Harian", "Jagung Cokelat Lembut", "Kacang Tanah Kroto",
  "Roti Kelapa Gurih", "Pelet Nanas Segar", "Pisang Susu Lomba", "Ubi Kuning Pandan", "Tahu Telur Amis",
  "Jagung Sarden Gurih", "Pelet Keju Susu", "Roti Kacang Harian", "Singkong Pandan Wangi", "Ubi Ungu Keju",
  "Tempe Telur Lomba", "Pelet Madu Jagung", "Kelapa Susu Lembut", "Biskuit Pandan Hemat", "Sarden Kroto Galatama",
  "Tahu Keju Ekonomis", "Jagung Kelapa Manis", "Pelet Vanila Putih", "Roti Pisang Gurih", "Ubi Susu Pandan",
  "Kacang Hijau Keju", "Tempe Sarden Harian", "Pelet Talas Wangi", "Jagung Madu Lomba", "Roti Susu Putih",
  "Singkong Kroto Galatama", "Ubi Keju Kukus", "Pelet Belimbing Harian", "Tahu Pandan Lembut", "Jagung Telur Bebek",
  "Kacang Santan Hijau", "Roti Sarden Gurih", "Pelet Pisang Keju", "Ubi Nangka Manis", "Tempe Madu Kolam",
  "Jagung Pandan Galatama", "Tahu Kroto Lomba", "Pelet Kelapa Gurih", "Roti Jagung Hemat", "Singkong Susu Putih",
  "Ubi Cokelat Wangi", "Kacang Keju Lomba", "Tempe Pandan Harian", "Pelet Susu Kroto",
] as const;

const expansionBases = ["Pelet", "Jagung", "Roti", "Ubi", "Tahu", "Singkong", "Kacang", "Tempe", "Kelapa", "Biskuit", "Sarden", "Pisang", "Tepung"];
const expansionProfiles = ["Pandan Wangi", "Susu Gurih", "Keju Lembut", "Kroto Segar", "Madu Manis", "Santan Kental", "Vanila Putih", "Kelapa Gurih"];
const expansionRecipeNames = expansionBases.flatMap((base) => expansionProfiles.map((profile) => `Racikan ${base} ${profile}`)).slice(0, 101);
const additionalRecipeNames = [...curatedAdditionalRecipeNames, ...expansionRecipeNames];

const catalogDifficulties: Recipe["difficulty"][] = ["Mudah", "Mudah", "Menengah", "Menengah", "Tingkat lanjut"];
const catalogSummaries = [
  "Racikan seimbang dengan aroma lembut untuk sesi mancing santai dan kondisi kolam yang berubah.",
  "Perpaduan bahan harian yang mudah didapat, diracik untuk menjaga tekstur tetap padat di kail.",
  "Racikan beraroma gurih yang dapat dicoba sebagai titik awal sebelum menyesuaikan karakter kolam.",
  "Komposisi praktis dengan karakter manis-gurih untuk pemancing yang ingin bereksperimen secara bertahap.",
];

function slugForGeneratedRecipe(name: string, index: number) {
  const normalized = name.toLocaleLowerCase("id-ID").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${normalized}-${String(index + 21).padStart(2, "0")}`;
}

const priorityProvinceRecipeTargets: Record<string, number> = {
  "Sumatera Utara": 18,
  "Jawa Barat": 30,
  Banten: 18,
  "DKI Jakarta": 14,
  "Jawa Tengah": 20,
  "DI Yogyakarta": 16,
  "Jawa Timur": 22,
};

// Core recipe tetap tersebar ke wilayah prioritas, lalu resep tambahan mengisi
// kuota hingga cakupan provinsi dan Jabodetabek sesuai katalog terbaru.
const coreProvinceAssignments = [
  "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Banten", "DKI Jakarta", "Sumatera Utara", "Jawa Barat", "DI Yogyakarta", "Jawa Barat", "Jawa Timur",
  "Banten", "Jawa Tengah", "Sumatera Utara", "DKI Jakarta", "Jawa Barat", "Jawa Timur", "Banten", "DI Yogyakarta", "Jawa Tengah", "Sumatera Utara",
];
const coreProvinceCounts = coreProvinceAssignments.reduce<Record<string, number>>((counts, province) => ({ ...counts, [province]: (counts[province] ?? 0) + 1 }), {});
const recipeProvinceAssignments = [
  ...coreProvinceAssignments,
  ...provinceDirectory.flatMap((province) => Array.from({ length: (priorityProvinceRecipeTargets[province.name] ?? 2) - (coreProvinceCounts[province.name] ?? 0) }, () => province.name)),
];

const normalizedCoreRecipes: CoreRecipe[] = coreRecipes.map((recipe, index) => ({
  ...recipe,
  provinces: [recipeProvinceAssignments[index]],
  reviewCount: Math.max(25, recipe.reviewCount),
}));

const generatedRecipes: CoreRecipe[] = additionalRecipeNames.map((name, index) => {
  const template = coreRecipes[index % coreRecipes.length];
  const catalogIndex = index + coreRecipes.length;
  return {
    ...template,
    slug: slugForGeneratedRecipe(name, index),
    name,
    rating: Number((4.2 + ((index * 3) % 8) / 10).toFixed(1)),
    reviewCount: 25 + ((index * 7) % 76),
    users: 180 + ((index * 137) % 2_800),
    popularity: 35 + ((index * 11) % 62),
    price: index % 5 === 0 ? "< Rp15.000" : index % 5 === 1 ? "Rp15.000–30.000" : index % 5 === 2 ? "Rp30.000–50.000" : index % 5 === 3 ? "Rp45.000–60.000" : "> Rp50.000",
    priceValue: index % 5 === 0 ? 14000 : index % 5 === 1 ? 24000 : index % 5 === 2 ? 38000 : index % 5 === 3 ? 52000 : 62000,
    difficulty: catalogDifficulties[index % catalogDifficulties.length],
    image: index % 3 === 0 ? "/images/recipe-putih.jpg" : index % 3 === 1 ? "/images/recipe-pelet.jpg" : "/images/recipe-jagung.jpg",
    provinces: [recipeProvinceAssignments[catalogIndex]],
    summary: `${name} adalah ${catalogSummaries[index % catalogSummaries.length].toLocaleLowerCase("id-ID")}`,
    ingredients: template.ingredients.map((ingredient) => ({ ...ingredient })),
    steps: [...template.steps],
    suitable: [...template.suitable],
    notSuitable: [...template.notSuitable],
  };
});

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
function withOptionalAdditions(recipe: Recipe, fromCatalog: boolean): Recipe {
  // Resep inti yang memang berbasis kroto (mis. Umpan Putih Kroto) memakai kroto
  // sebagai bahan inti. Resep turunan katalog mewarisi bahan template, jadi kroto
  // warisan tersebut cukup ditandai opsional agar tidak menyesatkan.
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
 * Semua resep katalog (inti + turunan) merakit `category` dari satu field yang
 * sama dengan tag kondisi, yaitu jenis pemancingan. Tidak ada lagi kategori yang
 * ditulis manual per resep maupun dipilih berdasarkan urutan kartu.
 */
export const recipes: Recipe[] = [...normalizedCoreRecipes, ...generatedRecipes].map((recipe, index) => {
  const fishingTypes = orderFishingTypes(recipe.name, recipe.fishingTypes);
  return withOptionalAdditions(
    { ...recipe, fishingTypes, category: fishingTypes[0] },
    index < normalizedCoreRecipes.length,
  );
});

/** Cakupan Jabodetabek dihitung dari resep berlabel DKI Jakarta, Jawa Barat, dan Banten. */
export const jabodetabekProvinces = ["DKI Jakarta", "Jawa Barat", "Banten"] as const;
export const jabodetabekRecipeCount = recipes.filter((recipe) => recipe.provinces.some((province) => jabodetabekProvinces.includes(province as (typeof jabodetabekProvinces)[number]))).length;

export const defaultPreferences = {
  province: "Jawa Barat",
  weather: "Hujan" as Weather,
  water: "Keruh" as WaterCondition,
  fishingType: "Harian" as FishingType,
  budget: "Rp15.000–30.000",
  season: "Musim Hujan",
};
