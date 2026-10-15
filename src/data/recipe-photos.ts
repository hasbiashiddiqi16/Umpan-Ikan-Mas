/**
 * Foto adonan per resep.
 *
 * Dulu seluruh katalog memutar tiga berkas yang sama (`recipe-putih`,
 * `recipe-pelet`, `recipe-jagung`) sehingga ratusan resep terlihat memakai
 * foto yang identik. Sekarang:
 *
 * - 20 resep inti punya foto adonannya sendiri di `public/images/recipes/`
 *   (tiga di antaranya tetap memakai berkas klasik yang memang fotonya cocok:
 *   umpan putih, pelet pandan, dan jagung kroto).
 * - Resep turunan katalog memakai berkas tersendiri per slug
 *   (`/images/recipes/<slug>.jpg`) yang dibuat dari foto adonan keluarga
 *   bahannya dengan `scripts/buat-foto-racikan.py` — dipotong dan di-grading
 *   berbeda per resep, jadi tidak ada dua resep berbagi berkas yang sama.
 * - Foto dari pengirim ulasan **tidak** dikarang: ulasan pengunjung saat ini
 *   tidak punya unggahan foto, jadi kartu komunitas memakai foto racikan
 *   katalog resep yang dicoba dan diberi label "Ilustrasi racikan".
 */

export type RecipePhotoOption = { value: string; label: string };

/** Foto tersendiri untuk 20 resep inti, dikunci dari slug-nya. */
export const CORE_RECIPE_PHOTOS: Record<string, string> = {
  "umpan-putih-kroto": "/images/recipe-putih.jpg",
  "pelet-pandan-wangi": "/images/recipe-pelet.jpg",
  "jagung-kroto-kuning": "/images/recipe-jagung.jpg",
  "keju-susu-kukus": "/images/recipes/keju-susu-kukus.jpg",
  "vanila-telur-bebek": "/images/recipes/vanila-telur-bebek.jpg",
  "kacang-santan-gurih": "/images/recipes/kacang-santan-gurih.jpg",
  "amis-udang-bawang": "/images/recipes/amis-udang-bawang.jpg",
  "roti-keju-ekonomis": "/images/recipes/roti-keju-ekonomis.jpg",
  "pelet-tuna-kroto": "/images/recipes/pelet-tuna-kroto.jpg",
  "ubi-madu-kukus": "/images/recipes/ubi-madu-kukus.jpg",
  "sagu-telur-madu": "/images/recipes/sagu-telur-madu.jpg",
  "kelapa-pandan-hijau": "/images/recipes/kelapa-pandan-hijau.jpg",
  "susu-kedelai-kroto": "/images/recipes/susu-kedelai-kroto.jpg",
  "kuning-santan-pisang": "/images/recipes/kuning-santan-pisang.jpg",
  "essen-mangga-pelet": "/images/recipes/essen-mangga-pelet.jpg",
  "roti-tawar-kroto-lomba": "/images/recipes/roti-tawar-kroto-lomba.jpg",
  "pelet-ikan-bawang-putih": "/images/recipes/pelet-ikan-bawang-putih.jpg",
  "sarden-susu-premium": "/images/recipes/sarden-susu-premium.jpg",
  "jagung-keju-kolam": "/images/recipes/jagung-keju-kolam.jpg",
  "amis-kuning-telur": "/images/recipes/amis-kuning-telur.jpg",
};

/** Pilihan foto untuk editor dashboard: seluruh foto inti, bukan tiga berkas lama saja. */
export const RECIPE_PHOTO_OPTIONS: RecipePhotoOption[] = [
  { value: "/images/recipe-putih.jpg", label: "Umpan putih kroto (klasik)" },
  { value: "/images/recipe-pelet.jpg", label: "Pelet pandan hijau (klasik)" },
  { value: "/images/recipe-jagung.jpg", label: "Jagung kroto kuning (klasik)" },
  ...Object.entries(CORE_RECIPE_PHOTOS)
    .filter(([, value]) => !value.startsWith("/images/recipe-"))
    .map(([slug, value]) => ({ value, label: `Adonan ${slug.replace(/-/g, " ")}` })),
];

/**
 * Keluarga tampilan adonan berdasarkan kata kunci nama resep. Dipakai untuk
 * memilih warna pada alt text; daftar prioritasnya sama dengan yang dipakai
 * `scripts/buat-foto-racikan.py` untuk memilih foto dasar resep turunan.
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
  return `Adonan ${recipe.name} berwarna ${recipePhotoWarna(recipe.name)}, berbahan ${bahan}; racikan ikan mas untuk ${jenis} di air ${air}`;
}

/** Berkas foto untuk resep turunan katalog: satu berkas per slug. */
export function generatedRecipeImage(slug: string): string {
  return `/images/recipes/${slug}.jpg`;
}
