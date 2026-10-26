-- Hapus permanen seluruh data contoh dan penandanya.
--
-- Data contoh yang dibersihkan:
-- - semua ulasan katalog lama (seed_key terisi), apa pun resepnya;
-- - tiga resep contoh katalog lama:
--   umpan-putih-kroto, vanila-telur-bebek, roti-tawar-kroto-lomba;
-- - seluruh referensi yang menunjuk ke data tersebut (laporan atas ulasan,
--   ulasan yang menempel pada resep contoh, favorit, media resep, dan
--   peristiwa analitik per resep), agar slug contoh tidak lagi menjadi
--   acuan di bagian mana pun dari sistem.
--
-- Setelah datanya hilang, kolom seed_key dan indeks uniknya ikut dihapus:
-- sistem tidak lagi mengenal konsep ulasan contoh.

DELETE FROM "cms_review_reports"
WHERE "review_id" IN (
  SELECT "id" FROM "cms_reviews"
  WHERE "recipe_slug" IN ('umpan-putih-kroto', 'vanila-telur-bebek', 'roti-tawar-kroto-lomba')
);--> statement-breakpoint

DELETE FROM "cms_review_reports"
WHERE "review_id" IN (SELECT "id" FROM "cms_reviews" WHERE "seed_key" IS NOT NULL);--> statement-breakpoint

DELETE FROM "cms_reviews" WHERE "seed_key" IS NOT NULL;--> statement-breakpoint

DELETE FROM "cms_reviews"
WHERE "recipe_slug" IN ('umpan-putih-kroto', 'vanila-telur-bebek', 'roti-tawar-kroto-lomba');--> statement-breakpoint

DELETE FROM "user_favorites"
WHERE "recipe_slug" IN ('umpan-putih-kroto', 'vanila-telur-bebek', 'roti-tawar-kroto-lomba');--> statement-breakpoint

DELETE FROM "analytics_events"
WHERE "entity_slug" IN ('umpan-putih-kroto', 'vanila-telur-bebek', 'roti-tawar-kroto-lomba')
   OR "path" IN ('/resep/umpan-putih-kroto', '/resep/vanila-telur-bebek', '/resep/roti-tawar-kroto-lomba');--> statement-breakpoint

DELETE FROM "cms_media"
WHERE "key" IN ('recipe-umpan-putih-kroto', 'recipe-vanila-telur-bebek', 'recipe-roti-tawar-kroto-lomba')
   OR "key" LIKE 'recipe-umpan-putih-kroto-%'
   OR "key" LIKE 'recipe-vanila-telur-bebek-%'
   OR "key" LIKE 'recipe-roti-tawar-kroto-lomba-%';--> statement-breakpoint

DELETE FROM "cms_recipes"
WHERE "slug" IN ('umpan-putih-kroto', 'vanila-telur-bebek', 'roti-tawar-kroto-lomba');--> statement-breakpoint

DROP INDEX IF EXISTS "cms_reviews_seed_key_unique";--> statement-breakpoint

ALTER TABLE "cms_reviews" DROP COLUMN IF EXISTS "seed_key";
