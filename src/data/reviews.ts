import { recipes } from "@/data/recipes";
import { catalogCities } from "@/data/geo-cities";

export type RecipeReview = {
  /** Kunci stabil untuk sinkronisasi ulasan contoh ke CMS tanpa duplikasi. */
  seedKey?: string;
  /**
   * `true` untuk ulasan contoh yang dibuat redaksi. Ulasan contoh **tidak boleh**
   * dihitung sebagai rating, jumlah ulasan, atau bukti komunitas — hanya boleh
   * tampil dengan label "Data contoh".
   */
  sample?: boolean;
  name: string;
  location: string;
  recipeSlug: string;
  rating: number;
  weather: string;
  water: string;
  /** Tipe perairan yang dicoba (Kolam/Sungai/Danau) — opsional, lihat `WaterBody`. */
  waterBody?: string;
  fishingType?: string;
  catchCount?: number;
  date: string;
  comment: string;
};

/**
 * Jumlah ulasan contoh per resep. Sengaja sedikit (bukan 25 seperti dulu) karena
 * ini hanya contoh bentuk ulasan, bukan bukti komunitas.
 */
export const SAMPLE_REVIEWS_PER_RECIPE = 3;

const sampleReviewers = [
  "Bayu Ramadhan", "Sinta Wulandari", "Hendra Gunawan",
  "Mira Anjani", "Dedi Kurnia", "Alia Puspitasari",
];

/**
 * Tanggal contoh dipatok jauh di belakang hari ini agar tidak pernah menjadi
 * tanggal masa depan. Tanggal masa depan adalah tanda data palsu, jadi validasi
 * server juga menolaknya (lihat `src/lib/review-dates.ts`).
 */
const sampleDates = ["12 September 2026", "29 Agustus 2026", "9 Agustus 2026"];

const sampleComments = [
  "Saya mengikuti takaran dasar lalu menyesuaikan sedikit airnya. Teksturnya mudah dibentuk dan cukup nyaman dipakai selama sesi.",
  "Bahannya mudah dicari di sekitar rumah. Saya menambahkan air sedikit demi sedikit agar adonan tidak terlalu lembek.",
  "Cocok dijadikan patokan awal sebelum menyesuaikan karakter kolam. Saya suka karena langkah raciknya mudah diikuti.",
  "Aromanya tidak berlebihan dan masih enak dipakai untuk sesi santai. Akan saya coba lagi saat kondisi air berbeda.",
  "Setelah menyesuaikan kelembapan adonan, umpan lebih mudah dipulung. Responsnya cukup stabil untuk sesi sore.",
  "Racikan terasa seimbang untuk kondisi yang saya dapat hari ini. Bahan tidak sulit dan prosesnya tidak memakan waktu lama.",
];

/** Daftar kota katalog per provinsi, dipakai agar contoh tidak menumpuk di satu kota. */
const catalogCitiesByProvince = catalogCities.reduce<Record<string, string[]>>((peta, kota) => {
  peta[kota.province] = [...new Set([...(peta[kota.province] ?? []), kota.name])];
  return peta;
}, {});

const cityByProvince: Record<string, string> = {
  Aceh: "Banda Aceh", "Sumatera Utara": "Medan", "Sumatera Barat": "Padang", Riau: "Pekanbaru", "Kepulauan Riau": "Tanjungpinang",
  Jambi: "Jambi", "Sumatera Selatan": "Palembang", "Kepulauan Bangka Belitung": "Pangkalpinang", Bengkulu: "Bengkulu", Lampung: "Bandar Lampung",
  "DKI Jakarta": "Jakarta Timur", "Jawa Barat": "Bogor", Banten: "Serang", "Jawa Tengah": "Semarang", "DI Yogyakarta": "Yogyakarta",
  "Jawa Timur": "Surabaya", Bali: "Denpasar", "Nusa Tenggara Barat": "Mataram", "Nusa Tenggara Timur": "Kupang", "Kalimantan Barat": "Pontianak",
  "Kalimantan Tengah": "Palangka Raya", "Kalimantan Selatan": "Banjarmasin", "Kalimantan Timur": "Samarinda", "Kalimantan Utara": "Tarakan", "Sulawesi Utara": "Manado",
  Gorontalo: "Gorontalo", "Sulawesi Tengah": "Palu", "Sulawesi Barat": "Mamuju", "Sulawesi Selatan": "Makassar", "Sulawesi Tenggara": "Kendari",
  Maluku: "Ambon", "Maluku Utara": "Ternate", Papua: "Jayapura", "Papua Barat": "Manokwari", "Papua Selatan": "Merauke",
  "Papua Tengah": "Nabire", "Papua Pegunungan": "Wamena", "Papua Barat Daya": "Sorong",
};

/**
 * Kota contoh untuk sebuah provinsi. Kalau provinsi itu punya daftar kota
 * katalog, kota dipilih bergiliran supaya tiga contoh tidak semuanya dari kota
 * yang sama (dulu semua contoh menumpuk di "Bogor").
 */
function sampleCity(province: string, offset: number) {
  const daftar = catalogCitiesByProvince[province];
  if (daftar?.length) return daftar[offset % daftar.length];
  return cityByProvince[province] ?? province;
}

/**
 * Contoh ulasan katalog: **3 per resep**, selalu berlabel "Data contoh", dan
 * tersebar di beberapa provinsi resep itu agar tidak terlihat seperti satu kota
 * yang sama berulang-ulang.
 *
 * Angka komunitas yang sebenarnya hanya berasal dari ulasan pengunjung yang
 * sudah disetujui (`cms_reviews` tanpa `seed_key`, tanggal tidak melewati
 * waktu server) — lihat `src/lib/review-summary.ts`.
 */
export const reviews: RecipeReview[] = recipes.flatMap((recipe, recipeIndex) => {
  const provincesForRecipe = recipe.provinces.length ? recipe.provinces : [recipe.provinces[0]];
  return Array.from({ length: SAMPLE_REVIEWS_PER_RECIPE }, (_, reviewIndex) => {
    const province = provincesForRecipe[(recipeIndex + reviewIndex) % provincesForRecipe.length];
    return {
      seedKey: `catalog:${recipe.slug}:${String(reviewIndex + 1).padStart(2, "0")}`,
      sample: true,
      name: sampleReviewers[(recipeIndex * 2 + reviewIndex) % sampleReviewers.length],
      location: `${sampleCity(province, recipeIndex * 2 + reviewIndex)}, ${province}`,
      recipeSlug: recipe.slug,
      rating: reviewIndex === 1 ? 4 : 5,
      weather: recipe.weather[reviewIndex % recipe.weather.length],
      water: recipe.water[reviewIndex % recipe.water.length],
      fishingType: recipe.fishingTypes[reviewIndex % recipe.fishingTypes.length],
      catchCount: 2 + ((recipeIndex * 3 + reviewIndex * 2) % 7),
      date: sampleDates[reviewIndex % sampleDates.length],
      comment: sampleComments[(recipeIndex + reviewIndex) % sampleComments.length],
    };
  });
});

/** Semua ulasan contoh yang tampil di katalog (untuk penghitung dan pengujian). */
export const sampleReviews = reviews.filter((review) => review.sample);
