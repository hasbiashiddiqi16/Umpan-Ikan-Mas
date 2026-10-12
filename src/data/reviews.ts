import { recipes } from "@/data/recipes";

export type RecipeReview = {
  /** Kunci stabil untuk sinkronisasi ulasan contoh ke CMS tanpa duplikasi. */
  seedKey?: string;
  name: string;
  location: string;
  recipeSlug: string;
  rating: number;
  weather: string;
  water: string;
  fishingType?: string;
  catchCount?: number;
  date: string;
  comment: string;
};

const reviewers = [
  "Budi Santoso", "Nanda Putri", "Rizky Firmansyah", "Teguh Wibowo", "Dwi Purnomo", "Agus Pratama", "Fajar Rahman", "Dewi Lestari",
  "Yusuf Maulana", "Rani Oktavia", "Maman Suherman", "Siti Nurhaliza", "Hendra Saputra", "Wahyu Hidayat", "Made Arya", "Rina Kurnia",
  "Dimas Saputra", "Lina Marlina", "Andi Kurniawan", "Putri Ananda", "Rudi Hartono", "Fitri Handayani", "Arman Prakoso", "Novi Wulandari", "Ilham Ramadhan",
  "Yani Kusuma", "Farhan Akbar", "Dian Permata", "Bagas Pratama", "Sari Puspita", "Rangga Setiawan", "Maya Kartika", "Fikri Hidayat", "Nia Ramadhani",
  "Yoga Prasetyo", "Intan Safitri", "Rio Mahendra", "Citra Lestari", "Bayu Saputra", "Vina Amelia",
];

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

const reviewComments = [
  "Saya mengikuti takaran dasar lalu menyesuaikan sedikit airnya. Teksturnya mudah dibentuk dan cukup nyaman dipakai selama sesi.",
  "Dicoba saat kondisi kolam berubah. Respons ikan tidak selalu sama, tetapi racikan ini memberi awal yang cukup baik.",
  "Bahannya mudah dicari di sekitar rumah. Saya menambahkan air sedikit demi sedikit agar adonan tidak terlalu lembek.",
  "Aromanya tidak berlebihan dan masih enak dipakai untuk sesi santai. Akan saya coba lagi saat kondisi air berbeda.",
  "Saya pakai beberapa jam dan adonan tetap cukup menempel di kail. Hasil tiap spot tentu berbeda, namun racikannya praktis.",
  "Cocok dijadikan patokan awal sebelum menyesuaikan karakter kolam. Saya suka karena langkah raciknya mudah diikuti.",
  "Setelah menyesuaikan kelembapan adonan, umpan lebih mudah dipulung. Responsnya cukup stabil untuk sesi sore.",
  "Racikan terasa seimbang untuk kondisi yang saya dapat hari ini. Bahan tidak sulit dan prosesnya tidak memakan waktu lama.",
];

const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const reviewsPerRecipe = 25;

function reviewDate(recipeIndex: number, reviewIndex: number) {
  const sequence = recipeIndex * reviewsPerRecipe + reviewIndex;
  const day = (sequence % 28) + 1;
  const month = months[(sequence * 3 + recipeIndex) % months.length];
  return `${day} ${month} 2026`;
}

/**
 * Setiap resep mempunyai tepat 25 ulasan contoh agar detail resep memiliki
 * bukti komunitas yang konsisten, tanpa membebani halaman komunitas sekaligus.
 */
export const reviews: RecipeReview[] = recipes.flatMap((recipe, recipeIndex) => {
  const province = recipe.provinces[0];
  const city = cityByProvince[province] ?? province;
  return Array.from({ length: reviewsPerRecipe }, (_, reviewIndex) => ({
    seedKey: `catalog:${recipe.slug}:${String(reviewIndex + 1).padStart(2, "0")}`,
    name: reviewers[(recipeIndex * 7 + reviewIndex) % reviewers.length],
    location: `${city}, ${province}`,
    recipeSlug: recipe.slug,
    rating: reviewIndex % 8 === 0 ? 4 : reviewIndex % 13 === 0 ? 3 : 5,
    weather: recipe.weather[reviewIndex % recipe.weather.length],
    water: recipe.water[reviewIndex % recipe.water.length],
    fishingType: recipe.fishingTypes[reviewIndex % recipe.fishingTypes.length],
    catchCount: 2 + ((recipeIndex * 5 + reviewIndex * 3) % 12),
    date: reviewDate(recipeIndex, reviewIndex),
    comment: reviewComments[(recipeIndex + reviewIndex) % reviewComments.length],
  }));
});
