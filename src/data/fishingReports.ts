export type FishingReport = {
  name: string;
  initials: string;
  location: string;
  date: string;
  recipe: string;
  recipeSlug: string;
  weather: string;
  water: string;
  fishingType: string;
  catchCount: number;
  rating: number;
  comment: string;
  color: string;
};

export const fishingReports: FishingReport[] = [
  { name: "Budi Santoso", initials: "BS", location: "Bogor, Jawa Barat", date: "2 hari lalu", recipe: "Umpan Putih Kroto", recipeSlug: "umpan-putih-kroto", weather: "Hujan", water: "Keruh", fishingType: "Harian", catchCount: 8, rating: 5, comment: "Dicoba sekitar 2 jam saat gerimis. Adonannya gampang dibentuk dan hasilnya cukup bagus.", color: "#d8e9d9" },
  { name: "Rina Kurnia", initials: "RK", location: "Semarang, Jawa Tengah", date: "3 hari lalu", recipe: "Pelet Pandan Wangi", recipeSlug: "pelet-pandan-wangi", weather: "Cerah", water: "Hijau", fishingType: "Harian", catchCount: 5, rating: 4, comment: "Aroma pandannya ringan, cocok untuk kolam langganan saya. Bahan juga gampang dicari.", color: "#f0e4cd" },
  { name: "Agus Pratama", initials: "AP", location: "Bandung, Jawa Barat", date: "5 hari lalu", recipe: "Jagung Kroto Kuning", recipeSlug: "jagung-kroto-kuning", weather: "Mendung", water: "Kekuningan", fishingType: "Lomba", catchCount: 11, rating: 5, comment: "Krotonya saya tambahkan belakangan. Dapat strike beberapa kali di babak kedua.", color: "#f2e5bb" },
  { name: "Dewi Lestari", initials: "DL", location: "Serang, Banten", date: "1 minggu lalu", recipe: "Keju Susu Kukus", recipeSlug: "keju-susu-kukus", weather: "Hujan", water: "Keruh", fishingType: "Lomba", catchCount: 6, rating: 5, comment: "Teksturnya pas dan tidak cepat hancur. Hasil tiap kolam bisa berbeda, tapi layak dicoba.", color: "#ebd8c5" },
  { name: "Fajar Ramadhan", initials: "FR", location: "Surabaya, Jawa Timur", date: "1 minggu lalu", recipe: "Jagung Kroto Kuning", recipeSlug: "jagung-kroto-kuning", weather: "Cerah", water: "Kekuningan", fishingType: "Harian", catchCount: 4, rating: 4, comment: "Saya pakai tanpa essen tambahan. Ada sambaran setelah ganti spot yang lebih teduh.", color: "#e8e8cd" },
  { name: "Yusuf Maulana", initials: "YM", location: "Depok, Jawa Barat", date: "8 hari lalu", recipe: "Umpan Putih Kroto", recipeSlug: "umpan-putih-kroto", weather: "Mendung", water: "Hijau", fishingType: "Galat", catchCount: 9, rating: 5, comment: "Cukup konsisten di kolam ini. Saya simpan resepnya untuk sesi minggu depan.", color: "#d8e9d9" },
  { name: "Siti Nurhaliza", initials: "SN", location: "Yogyakarta, DI Yogyakarta", date: "9 hari lalu", recipe: "Roti Keju Ekonomis", recipeSlug: "roti-keju-ekonomis", weather: "Cerah", water: "Jernih", fishingType: "Harian", catchCount: 3, rating: 4, comment: "Simpel banget dibuat sebelum berangkat. Hasilnya lumayan untuk sesi sore.", color: "#f0e4cd" },
  { name: "Dimas Saputra", initials: "DS", location: "Palembang, Sumatera Selatan", date: "10 hari lalu", recipe: "Kacang Santan Gurih", recipeSlug: "kacang-santan-gurih", weather: "Hujan", water: "Keruh", fishingType: "Harian", catchCount: 7, rating: 5, comment: "Aromanya gurih dan semua bahannya ada di rumah. Hasilnya jadi bonus yang menyenangkan.", color: "#eadbc4" },
  { name: "Wahyu Hidayat", initials: "WH", location: "Bekasi, Jawa Barat", date: "2 minggu lalu", recipe: "Vanila Telur Bebek", recipeSlug: "vanila-telur-bebek", weather: "Berawan", water: "Hijau", fishingType: "Lomba", catchCount: 5, rating: 4, comment: "Saya pakai sedikit saja essen vanilanya. Adonan cukup awet sampai sesi selesai.", color: "#e9ddeb" },
  { name: "Made Arya", initials: "MA", location: "Denpasar, Bali", date: "2 minggu lalu", recipe: "Jagung Keju Kolam", recipeSlug: "jagung-keju-kolam", weather: "Cerah", water: "Kekuningan", fishingType: "Harian", catchCount: 4, rating: 4, comment: "Campuran jagungnya cukup mudah dipulung. Dicoba di kolam air hangat sore hari.", color: "#f2e5bb" },
];
