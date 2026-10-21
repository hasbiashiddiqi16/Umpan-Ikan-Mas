/**
 * Tipe ulasan resep yang dipakai di seluruh situs.
 *
 * Data ulasan contoh yang dulu dibuat statis di berkas ini sudah dihapus:
 * ulasan yang tampil dan dihitung hanya kiriman pengunjung asli dari basis
 * data (`cms_reviews` tanpa `seed_key`) dan salinan lokal milik pengirim
 * sendiri. Field `seedKey`/`sample` dipertahankan pada tipe hanya agar
 * data lama yang terlanjur tersimpan tetap terbaca dengan aman.
 */
export type RecipeReview = {
  /** Kunci stabil untuk sinkronisasi ulasan contoh ke CMS tanpa duplikasi. */
  seedKey?: string;
  /**
   * `true` untuk ulasan contoh yang dibuat redaksi. Ulasan contoh **tidak boleh**
   * dihitung sebagai rating, jumlah ulasan, atau bukti komunitas — hanya boleh
   * tampil dengan label "Data contoh".
   */
  sample?: boolean;
  /**
   * Status moderasi untuk salinan lokal milik pengirim. Hanya "pending"
   * yang ditampilkan berlabel "Menunggu pemeriksaan"; ulasan dari server
   * selalu yang sudah tampil publik.
   */
  /** ID baris server untuk ulasan publik (dipakai tombol Laporkan). */
  id?: number;
  status?: "pending" | "approved";
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
  /** Durasi sesi dalam menit (0,5–24 jam) — opsional, dari ulasan pengunjung. */
  sessionMinutes?: number;
  /** Jumlah joran yang dipakai (1–10) — opsional. */
  rodCount?: number;
  date: string;
  comment: string;
};
