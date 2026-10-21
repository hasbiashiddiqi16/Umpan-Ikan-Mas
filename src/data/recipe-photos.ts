/**
 * Foto adonan per resep.
 *
 * Katalog kini hanya berisi tiga resep DKI Jakarta, dan masing-masing
 * punya berkas fotonya sendiri:
 *
 * - Umpan Putih Kroto memakai berkas klasik `/images/recipe-putih.jpg`
 *   yang memang cocok dengan adonannya.
 * - Vanila Telur Bebek dan Roti Tawar Kroto Lomba memakai berkas
 *   tersendiri di `public/images/recipes/<slug>.jpg`.
 *
 * Foto dari pengirim ulasan **tidak** dikarang: ulasan pengunjung saat ini
 * tidak punya unggahan foto, jadi kartu komunitas memakai foto racikan
 * katalog resep yang dicoba dan diberi label "Ilustrasi racikan".
 */

/** Foto tersendiri untuk resep yang dipertahankan, dikunci dari slug-nya. */
export const CORE_RECIPE_PHOTOS: Record<string, string> = {
  "umpan-putih-kroto": "/images/recipe-putih.jpg",
  "vanila-telur-bebek": "/images/recipes/vanila-telur-bebek.jpg",
  "roti-tawar-kroto-lomba": "/images/recipes/roti-tawar-kroto-lomba.jpg",
};

/**
 * Keluarga tampilan adonan berdasarkan kata kunci nama resep. Dipakai untuk
 * memilih warna pada alt text.
 */
const PHOTO_FAMILIES: { keywords: string[]; warna: string }[] = [
  { keywords: ["ungu"], warna: "ungu ubi" },
  { keywords: ["cokelat"], warna: "cokelat gelap" },
  { keywords: ["pandan"], warna: "hijau pandan" },
  { keywords: ["jagung"], warna: "kuning jagung" },
  { keywords: ["kroto"], warna: "pucat bertabur kroto" },
  { keywords: ["sarden", "udang", "belut", "amis", "tuna"], warna: "cokelat kemerahan keamis-amisan" },
  { keywords: ["pisang", "nanas", "mangga", "nangka", "durian", "belimbing"], warna: "kuning buah tropis" },
  { keywords: ["ubi", "talas"], warna: "oranye ubi kukus" },
  { keywords: ["tahu", "sagu"], warna: "putih lembut" },
  { keywords: ["singkong"], warna: "putih singkong" },
  { keywords: ["tempe"], warna: "krem berbintik kedelai" },
  { keywords: ["kacang"], warna: "cokelat muda kacang" },
  { keywords: ["biskuit"], warna: "kuning remah biskuit" },
  { keywords: ["roti"], warna: "putih lembut roti" },
  { keywords: ["kelapa", "santan"], warna: "hijau kelapa pandan" },
  { keywords: ["keju"], warna: "kuning pucat keju susu" },
  { keywords: ["susu"], warna: "krem susu" },
  { keywords: ["madu"], warna: "kuning madu" },
  { keywords: ["vanila", "vanilla"], warna: "krem vanila" },
  { keywords: ["telur"], warna: "kuning telur" },
  { keywords: ["pelet", "tepung"], warna: "cokelat pelet" },
];

/** Warna/karakter adonan yang terlihat di foto resep ini. */
export function recipePhotoWarna(name: string): string {
  const normalized = name.toLocaleLowerCase("id-ID");
  return PHOTO_FAMILIES.find((family) => family.keywords.some((keyword) => normalized.includes(keyword)))?.warna ?? "pucat alami";
}

type AltIngredient = { name: string; optional?: boolean };

/**
 * Alt text unik per resep: menyebut nama resep, warna adonan pada fotonya,
 * bahan inti (yang tidak opsional), dan konteks pemancingannya. Ditulis dari
 * data resep yang sama untuk semua tempat tampil (kartu katalog, rekomendasi,
 * halaman detail, dan metadata berbagi), jadi tidak ada alt generik yang
 * diulang antarresep.
 */
export function buildRecipeImageAlt(recipe: {
  name: string;
  ingredients: readonly AltIngredient[];
  fishingTypes: readonly string[];
  water: readonly string[];
}): string {
  const bahanInti = recipe.ingredients.filter((item) => !item.optional).slice(0, 3).map((item) => item.name.toLocaleLowerCase("id-ID"));
  const bahan = bahanInti.length ? bahanInti.join(", ") : "bahan racikan pilihan";
  const jenis = recipe.fishingTypes[0] ?? "Harian";
  const air = recipe.water[0]?.toLocaleLowerCase("id-ID") ?? "keruh";
  return `Adonan ${recipe.name} berwarna ${recipePhotoWarna(recipe.name)}, berbahan ${bahan}. Racikan ikan mas untuk ${jenis} di air ${air}`;
}
