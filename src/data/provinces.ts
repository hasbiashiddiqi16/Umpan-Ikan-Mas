export type Province = {
  name: string;
  slug: string;
  recipeCount: number;
  reportCount: number;
  popularRecipe: string;
};

export const provinces: Province[] = [
  { name: "Aceh", slug: "aceh", recipeCount: 18, reportCount: 246, popularRecipe: "Pelet Pandan Wangi" },
  { name: "Sumatera Utara", slug: "sumatera-utara", recipeCount: 42, reportCount: 614, popularRecipe: "Susu Kedelai Kroto" },
  { name: "Sumatera Barat", slug: "sumatera-barat", recipeCount: 23, reportCount: 328, popularRecipe: "Jagung Kroto Kuning" },
  { name: "Riau", slug: "riau", recipeCount: 31, reportCount: 442, popularRecipe: "Kacang Santan Gurih" },
  { name: "Kepulauan Riau", slug: "kepulauan-riau", recipeCount: 16, reportCount: 193, popularRecipe: "Pelet Pandan Wangi" },
  { name: "Jambi", slug: "jambi", recipeCount: 21, reportCount: 286, popularRecipe: "Kelapa Pandan Hijau" },
  { name: "Sumatera Selatan", slug: "sumatera-selatan", recipeCount: 37, reportCount: 524, popularRecipe: "Kacang Santan Gurih" },
  { name: "Kepulauan Bangka Belitung", slug: "kepulauan-bangka-belitung", recipeCount: 14, reportCount: 165, popularRecipe: "Jagung Kroto Kuning" },
  { name: "Bengkulu", slug: "bengkulu", recipeCount: 17, reportCount: 212, popularRecipe: "Umpan Putih Kroto" },
  { name: "Lampung", slug: "lampung", recipeCount: 32, reportCount: 408, popularRecipe: "Jagung Kroto Kuning" },
  { name: "DKI Jakarta", slug: "dki-jakarta", recipeCount: 46, reportCount: 713, popularRecipe: "Umpan Putih Kroto" },
  { name: "Jawa Barat", slug: "jawa-barat", recipeCount: 127, reportCount: 8421, popularRecipe: "Umpan Putih Kroto" },
  { name: "Banten", slug: "banten", recipeCount: 65, reportCount: 1920, popularRecipe: "Umpan Putih Kroto" },
  { name: "Jawa Tengah", slug: "jawa-tengah", recipeCount: 89, reportCount: 3672, popularRecipe: "Pelet Pandan Wangi" },
  { name: "DI Yogyakarta", slug: "di-yogyakarta", recipeCount: 34, reportCount: 986, popularRecipe: "Roti Keju Ekonomis" },
  { name: "Jawa Timur", slug: "jawa-timur", recipeCount: 94, reportCount: 4210, popularRecipe: "Jagung Kroto Kuning" },
  { name: "Bali", slug: "bali", recipeCount: 27, reportCount: 502, popularRecipe: "Jagung Keju Kolam" },
  { name: "Nusa Tenggara Barat", slug: "nusa-tenggara-barat", recipeCount: 19, reportCount: 264, popularRecipe: "Kuning Santan Pisang" },
  { name: "Nusa Tenggara Timur", slug: "nusa-tenggara-timur", recipeCount: 15, reportCount: 172, popularRecipe: "Pelet Pandan Wangi" },
  { name: "Kalimantan Barat", slug: "kalimantan-barat", recipeCount: 23, reportCount: 295, popularRecipe: "Kelapa Pandan Hijau" },
  { name: "Kalimantan Tengah", slug: "kalimantan-tengah", recipeCount: 18, reportCount: 217, popularRecipe: "Kacang Santan Gurih" },
  { name: "Kalimantan Selatan", slug: "kalimantan-selatan", recipeCount: 29, reportCount: 604, popularRecipe: "Susu Kedelai Kroto" },
  { name: "Kalimantan Timur", slug: "kalimantan-timur", recipeCount: 31, reportCount: 559, popularRecipe: "Essen Mangga Pelet" },
  { name: "Kalimantan Utara", slug: "kalimantan-utara", recipeCount: 12, reportCount: 134, popularRecipe: "Pelet Pandan Wangi" },
  { name: "Sulawesi Utara", slug: "sulawesi-utara", recipeCount: 20, reportCount: 279, popularRecipe: "Jagung Kroto Kuning" },
  { name: "Gorontalo", slug: "gorontalo", recipeCount: 12, reportCount: 136, popularRecipe: "Pelet Pandan Wangi" },
  { name: "Sulawesi Tengah", slug: "sulawesi-tengah", recipeCount: 18, reportCount: 208, popularRecipe: "Jagung Keju Kolam" },
  { name: "Sulawesi Barat", slug: "sulawesi-barat", recipeCount: 11, reportCount: 121, popularRecipe: "Kacang Santan Gurih" },
  { name: "Sulawesi Selatan", slug: "sulawesi-selatan", recipeCount: 38, reportCount: 780, popularRecipe: "Essen Mangga Pelet" },
  { name: "Sulawesi Tenggara", slug: "sulawesi-tenggara", recipeCount: 16, reportCount: 182, popularRecipe: "Jagung Kroto Kuning" },
  { name: "Maluku", slug: "maluku", recipeCount: 10, reportCount: 98, popularRecipe: "Pelet Pandan Wangi" },
  { name: "Maluku Utara", slug: "maluku-utara", recipeCount: 9, reportCount: 88, popularRecipe: "Umpan Putih Kroto" },
  { name: "Papua", slug: "papua", recipeCount: 18, reportCount: 215, popularRecipe: "Jagung Kroto Kuning" },
  { name: "Papua Barat", slug: "papua-barat", recipeCount: 8, reportCount: 74, popularRecipe: "Pelet Pandan Wangi" },
  { name: "Papua Selatan", slug: "papua-selatan", recipeCount: 6, reportCount: 52, popularRecipe: "Ubi Madu Kukus" },
  { name: "Papua Tengah", slug: "papua-tengah", recipeCount: 7, reportCount: 61, popularRecipe: "Jagung Kroto Kuning" },
  { name: "Papua Pegunungan", slug: "papua-pegunungan", recipeCount: 4, reportCount: 27, popularRecipe: "Umpan Putih Kroto" },
  { name: "Papua Barat Daya", slug: "papua-barat-daya", recipeCount: 8, reportCount: 69, popularRecipe: "Pelet Pandan Wangi" },
];
