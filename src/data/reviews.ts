export type RecipeReview = {
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

export const reviews: RecipeReview[] = [
  { name: "Budi Santoso", location: "Bogor, Jawa Barat", recipeSlug: "umpan-putih-kroto", rating: 5, weather: "Hujan", water: "Keruh", catchCount: 7, date: "12 Mei 2025", comment: "Saya coba saat hujan dengan air agak keruh. Dalam 2 jam dapat 7 ekor. Teksturnya juga enak dipakai." },
  { name: "Nanda Putri", location: "Depok, Jawa Barat", recipeSlug: "umpan-putih-kroto", rating: 5, weather: "Mendung", water: "Hijau", catchCount: 5, date: "8 Mei 2025", comment: "Bahannya mudah didapat di minimarket dekat rumah. Hasil tentu tergantung kondisi kolam, tapi saya puas." },
  { name: "Rizky Firmansyah", location: "Bekasi, Jawa Barat", recipeSlug: "umpan-putih-kroto", rating: 4, weather: "Hujan", water: "Keruh", catchCount: 4, date: "4 Mei 2025", comment: "Saya kurangi sedikit santannya supaya tidak terlalu lembek. Cukup oke untuk sesi sore." },
  { name: "Teguh Wibowo", location: "Semarang, Jawa Tengah", recipeSlug: "pelet-pandan-wangi", rating: 5, weather: "Cerah", water: "Hijau", catchCount: 6, date: "11 Mei 2025", comment: "Pandan segar bikin aromanya enak. Saya tidak menambahkan essen lagi." },
  { name: "Dwi Purnomo", location: "Solo, Jawa Tengah", recipeSlug: "pelet-pandan-wangi", rating: 4, weather: "Berawan", water: "Jernih", catchCount: 3, date: "7 Mei 2025", comment: "Racikan simpel dan hemat. Cocok untuk latihan dan mancing santai." },
  { name: "Agus Pratama", location: "Malang, Jawa Timur", recipeSlug: "jagung-kroto-kuning", rating: 5, weather: "Mendung", water: "Kekuningan", catchCount: 11, date: "10 Mei 2025", comment: "Dipakai waktu lomba kecil, dapat respons cukup cepat di awal sesi." },
  { name: "Fajar Rahman", location: "Surabaya, Jawa Timur", recipeSlug: "jagung-kroto-kuning", rating: 4, weather: "Cerah", water: "Keruh", catchCount: 4, date: "2 Mei 2025", comment: "Saya coba tanpa kroto tambahan, tetap lumayan. Akan coba lagi di kolam yang berbeda." },
  { name: "Dewi Lestari", location: "Serang, Banten", recipeSlug: "keju-susu-kukus", rating: 5, weather: "Hujan", water: "Keruh", catchCount: 6, date: "9 Mei 2025", comment: "Aroma gurihnya terasa. Jangan lupa tunggu dingin dulu sebelum dipulung." },
  { name: "Yusuf Maulana", location: "Bogor, Jawa Barat", recipeSlug: "keju-susu-kukus", rating: 4, weather: "Mendung", water: "Hijau", catchCount: 5, date: "5 Mei 2025", comment: "Sedikit lebih mahal, tapi bahan dan langkahnya jelas. Hasilnya cukup konsisten di spot saya." },
  { name: "Rani Oktavia", location: "Jakarta Selatan, DKI Jakarta", recipeSlug: "vanila-telur-bebek", rating: 5, weather: "Berawan", water: "Hijau", catchCount: 5, date: "8 Mei 2025", comment: "Essen vanila pakainya sedikit saja. Saya suka tekstur adonannya." },
  { name: "Maman Suherman", location: "Bandung, Jawa Barat", recipeSlug: "kacang-santan-gurih", rating: 4, weather: "Hujan", water: "Keruh", catchCount: 6, date: "6 Mei 2025", comment: "Bahan rumahan dan tidak ribet. Saya tambah sedikit tepung supaya tahan di kail." },
  { name: "Siti Nurhaliza", location: "Yogyakarta, DI Yogyakarta", recipeSlug: "roti-keju-ekonomis", rating: 4, weather: "Cerah", water: "Jernih", catchCount: 3, date: "1 Mei 2025", comment: "Praktis banget kalau lupa menyiapkan umpan. Cukup untuk mancing santai." },
  { name: "Hendra Saputra", location: "Palembang, Sumatera Selatan", recipeSlug: "susu-kedelai-kroto", rating: 5, weather: "Hujan", water: "Kekuningan", catchCount: 8, date: "3 Mei 2025", comment: "Pakai susu kedelai tanpa gula dan hasilnya tidak terlalu menyengat." },
  { name: "Wahyu Hidayat", location: "Tangerang, Banten", recipeSlug: "roti-tawar-kroto-lomba", rating: 5, weather: "Mendung", water: "Keruh", catchCount: 9, date: "30 April 2025", comment: "Kroto jangan terlalu lama diaduk supaya tetap utuh. Di kolam ini hasilnya memuaskan." },
  { name: "Made Arya", location: "Denpasar, Bali", recipeSlug: "jagung-keju-kolam", rating: 4, weather: "Cerah", water: "Kekuningan", catchCount: 4, date: "29 April 2025", comment: "Aroma jagungnya natural. Saya pakai untuk sesi sore di kolam harian." },
];
