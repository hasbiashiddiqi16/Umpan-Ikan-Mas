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
  /**
   * Durasi sesi (menit) dan jumlah joran. Ada **hanya sebagai contoh format**,
   * karena laporan ini adalah "Data contoh" buatan redaksi: tanpa durasi dan
   * jumlah joran, angka tangkapan tidak bisa dibandingkan.
   */
  sessionMinutes: number;
  rodCount: number;
  rating: number;
  comment: string;
  color: string;
};

export const fishingReports: FishingReport[] = [
  { name: "Budi Santoso", initials: "BS", location: "Bogor, Jawa Barat", date: "2 hari lalu", recipe: "Umpan Putih Kroto", recipeSlug: "umpan-putih-kroto", weather: "Hujan", water: "Keruh", fishingType: "Harian", sessionMinutes: 120, rodCount: 2, catchCount: 8, rating: 5, comment: "Dicoba sekitar 2 jam saat gerimis. Adonannya gampang dibentuk dan hasilnya cukup bagus.", color: "#d8e9d9" },
  { name: "Yusuf Maulana", initials: "YM", location: "Depok, Jawa Barat", date: "8 hari lalu", recipe: "Umpan Putih Kroto", recipeSlug: "umpan-putih-kroto", weather: "Mendung", water: "Hijau", fishingType: "Harian", sessionMinutes: 240, rodCount: 2, catchCount: 9, rating: 5, comment: "Cukup konsisten di kolam ini. Saya simpan resepnya untuk sesi minggu depan.", color: "#d8e9d9" },
  { name: "Wahyu Hidayat", initials: "WH", location: "Bekasi, Jawa Barat", date: "2 minggu lalu", recipe: "Vanila Telur Bebek", recipeSlug: "vanila-telur-bebek", weather: "Berawan", water: "Hijau", fishingType: "Lomba", sessionMinutes: 240, rodCount: 1, catchCount: 5, rating: 4, comment: "Saya pakai sedikit saja essen vanilanya. Adonan cukup awet sampai sesi selesai.", color: "#e9ddeb" },
];
