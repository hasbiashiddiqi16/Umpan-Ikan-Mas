import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mengizinkan host preview Arena saat menjalankan Next.js dalam mode development.
  allowedDevOrigins: ["*.e2b.app"],
  experimental: {
    // Batasi halaman yang digambar bersamaan saat build (prerender).
    // Tanpa batas, puluhan halaman statis membaca basis data sekaligus
    // dari banyak worker; query build berebut koneksi pooler dan gagal,
    // sehingga hasil build berisi data cadangan (katalog bawaan/rating
    // kosong) yang kemudian disajikan setelah deploy sampai gambar
    // ulang runtime pertama. Empat halaman sejajar menjaga bacaan
    // build tetap ringan; pooler mode transaksi menangani sisanya.
    staticGenerationMaxConcurrency: 4,
  },
  compress: true,
  poweredByHeader: false,
  images: {
    // Format modern: AVIF didahulukan, WebP sebagai cadangan; browser yang
    // tidak mendukung keduanya menerima format asal. Ukuran yang diminta
    // browser ditentukan atribut `sizes` per konteks (lihat komponen kartu
    // dan hero) — bukan lebar bawaan terbesar.
    formats: ["image/avif", "image/webp"],
    // Tanpa 3840: lebar terbesar yang benar-benar dibutuhkan adalah hero
    // selebar wadah 1280px (≈2048 untuk DPR 2). Membuang 3840 dari daftar
    // memastikan tidak ada permintaan `w=3840` — termasuk untuk thumbnail
    // kartu — sementara `sizes` yang benar membuat browser memilih lebar
    // kecil yang sesuai tempat tampilnya.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
