-- Pembersihan katalog menuju data jujur: situs kini hanya mempertahankan
-- tiga resep yang cocok dicoba di DKI Jakarta, dan hanya ulasan contoh
-- berlabel untuk ketiga resep itu. Semua baris lain dihapus agar tidak
-- lagi menumpuk di basis data.
--
-- Resep yang dipertahankan:
--   umpan-putih-kroto, vanila-telur-bebek, roti-tawar-kroto-lomba
-- Ulasan yang dipertahankan: tepat 9 ulasan contoh katalog
-- (seed_key catalog:<slug>:01..03 untuk ketiga slug di atas). Ulasan
-- pengunjung (seed_key kosong) ikut dihapus sesuai keputusan pemilik
-- situs untuk memulai dari data contoh berlabel saja.

-- 1) Ulasan: hapus semua selain 9 contoh untuk tiga resep di atas.
DELETE FROM "cms_reviews"
WHERE "seed_key" IS NULL
   OR "seed_key" NOT IN (
     'catalog:umpan-putih-kroto:01', 'catalog:umpan-putih-kroto:02', 'catalog:umpan-putih-kroto:03',
     'catalog:vanila-telur-bebek:01', 'catalog:vanila-telur-bebek:02', 'catalog:vanila-telur-bebek:03',
     'catalog:roti-tawar-kroto-lomba:01', 'catalog:roti-tawar-kroto-lomba:02', 'catalog:roti-tawar-kroto-lomba:03'
   );--> statement-breakpoint

-- 2) Tiga resep yang dipertahankan: fokuskan labelnya ke DKI Jakarta dan
--    kosongkan angka katalog (rating/jumlah ulasan/pemancing/popularitas).
--    Angka komunitas hanya boleh berasal dari ulasan pengunjung asli.
UPDATE "cms_recipes"
SET "provinces" = '["DKI Jakarta"]'::jsonb,
    "rating_tenths" = 0,
    "review_count" = 0,
    "users" = 0,
    "popularity" = 0,
    "updated_at" = now()
WHERE "slug" IN ('umpan-putih-kroto', 'vanila-telur-bebek', 'roti-tawar-kroto-lomba');--> statement-breakpoint

-- 3) Resep: hapus semua selain tiga resep di atas.
DELETE FROM "cms_recipes"
WHERE "slug" NOT IN ('umpan-putih-kroto', 'vanila-telur-bebek', 'roti-tawar-kroto-lomba');
